#include "CRGameMode.h"
#include "CRCharacter.h"
#include "CREnemy.h"
#include "CRVehicle.h"
#include "CRFx.h"
#include "CRGameInstance.h"
#include "CRHUD.h"
#include "CRPlayerController.h"
#include "CRSaveGame.h"
#include "CRWorldActor.h"
#include "Camera/CameraActor.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Camera/CameraComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/ExponentialHeightFog.h"
#include "Engine/SkyLight.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/DamageType.h"
#include "Kismet/GameplayStatics.h"
#include "TimerManager.h"

ACRGameMode::ACRGameMode()
{
	PrimaryActorTick.bCanEverTick = true;
	DefaultPawnClass = nullptr;
	PlayerControllerClass = ACRPlayerController::StaticClass();
	HUDClass = ACRHUD::StaticClass();
}

UCRGameInstance* ACRGameMode::GI() const { return GetGameInstance<UCRGameInstance>(); }
ACRPlayerController* ACRGameMode::GetPC() const { return Cast<ACRPlayerController>(UGameplayStatics::GetPlayerController(this, 0)); }
ACRHUD* ACRGameMode::GetHUD2() const
{
	APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0);
	return PC ? Cast<ACRHUD>(PC->GetHUD()) : nullptr;
}

void ACRGameMode::BeginPlay()
{
	Super::BeginPlay();
	// short delay so that the PlayerController and HUD already exist
	FTimerHandle Boot;
	GetWorldTimerManager().SetTimer(Boot, this, &ACRGameMode::EnterMenu, 0.3f, false);
}

void ACRGameMode::PlaySfx(ECRSfx Kind, float Vol)
{
	UCRGameInstance* G = GI();
	const float M = (G && G->Profile) ? G->Profile->MasterVolume : 0.6f;
	CRAudio::Play(this, Kind, Vol, M);
}

void ACRGameMode::AddBlood(float Dmg) { if (ACRHUD* H = GetHUD2()) H->AddBlood(Dmg); }
void ACRGameMode::HitMarker() { if (ACRHUD* H = GetHUD2()) H->HitMarker(); }

// ---------------- states ----------------
void ACRGameMode::ClearAll()
{
	GetWorldTimerManager().ClearTimer(EndTimer);
	if (ACRPlayerController* PC = GetPC()) PC->UnPossess();
	if (PlayerChar) { PlayerChar->Destroy(); PlayerChar = nullptr; }
	for (ACREnemy* E : Enemies) if (E) E->Destroy();
	Enemies.Empty();
	for (ACRVehicle* V : Vehicles) if (V) V->Destroy();
	Vehicles.Empty();
	Smokes.Empty();
	for (FMine& M : Mines) if (M.Actor.IsValid()) M.Actor->Destroy();
	Mines.Empty();
	for (FKit& K : Kits) if (K.Actor.IsValid()) K.Actor->Destroy();
	Kits.Empty();
	for (AActor* A : EnvActors) if (A) A->Destroy();
	EnvActors.Empty();
	if (World) { World->Destroy(); World = nullptr; }
	if (MenuCam) { MenuCam->Destroy(); MenuCam = nullptr; }
	for (TActorIterator<ACRParticles> It(GetWorld()); It; ++It) It->Destroy();
	for (TActorIterator<ACRGrenade> It(GetWorld()); It; ++It) It->Destroy();
	for (TActorIterator<ACRRocket> It(GetWorld()); It; ++It) It->Destroy();
	for (TActorIterator<ACRArrow> It(GetWorld()); It; ++It) It->Destroy();
	for (TActorIterator<ACRFireZone> It(GetWorld()); It; ++It) It->Destroy();
	for (TActorIterator<ACRSmokeCloud> It(GetWorld()); It; ++It) It->Destroy();
	Killed = TotalEnemies = 0;
	NearMineM = -1.f;
	FlashAlpha = 0.f;
	Msg.Empty();
}

void ACRGameMode::BuildEnvironment(int32 Level)
{
	const FCRLevelDef& L = CRData::Levels()[Level];
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	// sun: the direction L.SunDir points TOWARD the sun
	const FRotator SunRot = (-L.SunDir).GetSafeNormal().Rotation();
	if (ADirectionalLight* Sun = GetWorld()->SpawnActor<ADirectionalLight>(ADirectionalLight::StaticClass(), FVector(0, 0, 5000), SunRot, P))
	{
		if (UDirectionalLightComponent* C = Cast<UDirectionalLightComponent>(Sun->GetLightComponent()))
		{
			C->SetMobility(EComponentMobility::Movable);
			C->SetIntensity(L.SunIntensity);
			C->SetLightColor(L.SunColor);
		}
		EnvActors.Add(Sun);
	}
	// SkyAtmosphere as a component on an empty actor
	if (ACRPropActor* SkyHolder = GetWorld()->SpawnActor<ACRPropActor>(ACRPropActor::StaticClass(), FTransform::Identity, P))
	{
		USkyAtmosphereComponent* Sky = NewObject<USkyAtmosphereComponent>(SkyHolder);
		Sky->SetupAttachment(SkyHolder->GetRootComponent());
		Sky->RegisterComponent();
		EnvActors.Add(SkyHolder);
	}
	if (ASkyLight* SL = GetWorld()->SpawnActor<ASkyLight>(ASkyLight::StaticClass(), FVector(0, 0, 8000), FRotator::ZeroRotator, P))
	{
		if (USkyLightComponent* C = SL->GetLightComponent())
		{
			C->SetMobility(EComponentMobility::Movable);
			C->bRealTimeCapture = true;
			C->SetIntensity(1.f);
		}
		EnvActors.Add(SL);
	}
	if (AExponentialHeightFog* Fog = GetWorld()->SpawnActor<AExponentialHeightFog>(AExponentialHeightFog::StaticClass(), FVector(0, 0, 0), FRotator::ZeroRotator, P))
	{
		if (UExponentialHeightFogComponent* C = Fog->GetComponent())
		{
			C->SetFogDensity(L.FogDensity);
			C->SetFogHeightFalloff(0.15f);
		}
		EnvActors.Add(Fog);
	}
}

void ACRGameMode::BuildWorld(int32 Level)
{
	BuildEnvironment(Level);
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	World = GetWorld()->SpawnActor<ACRWorldActor>(ACRWorldActor::StaticClass(), FTransform::Identity, P);
	if (World) World->Build(Level);
}

void ACRGameMode::EnterMenu()
{
	ClearAll();
	State = EState::Menu;
	BuildWorld(0);
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	MenuCam = GetWorld()->SpawnActor<ACameraActor>(ACameraActor::StaticClass(), FVector(0, 7000, 3000), FRotator::ZeroRotator, P);
	if (ACRPlayerController* PC = GetPC())
	{
		PC->SetMenuInput(true);
		if (MenuCam) PC->SetViewTarget(MenuCam);
	}
	if (ACRHUD* H = GetHUD2()) H->Screen = ACRHUD::EScreen::Main;
}

void ACRGameMode::StartMission(int32 Index)
{
	UCRGameInstance* G = GI();
	if (!G || !G->Profile || !G->IsUnlocked(Index)) return;
	G->CurrentLevel = Index;
	CurLevel = Index;
	ClearAll();
	BuildWorld(Index);
	if (!World) return;
	Killed = 0;
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	const FVector Start(0.f, 7000.f, World->H(0.f, 70.f) * 100.f + 120.f);
	PlayerChar = GetWorld()->SpawnActor<ACRCharacter>(ACRCharacter::StaticClass(), Start, FRotator(0.f, -90.f, 0.f), P);
	if (ACRPlayerController* PC = GetPC())
	{
		if (PlayerChar)
		{
			PC->Possess(PlayerChar);
			PC->SetControlRotation(FRotator(0.f, -90.f, 0.f));
			PC->SetViewTarget(PlayerChar);
		}
		PC->SetMenuInput(false);
	}
	if (PlayerChar) PlayerChar->InitFromProfile();
	SpawnEntities();
	State = EState::Playing;
	Say(CRData::Levels()[Index].Brief, 4.f);
}

void ACRGameMode::SpawnEntities()
{
	const FCRLevelDef& L = CRData::Levels()[CurLevel];
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;
	for (int32 i = 0; i < L.Mines; ++i)
	{
		const FVector2D S = World->FreeSpot(false, 16.f, 1.6f, 72.f);
		const FVector Loc(S.X * 100.f, S.Y * 100.f, World->H(S.X, S.Y) * 100.f + 4.f);
		ACRPropActor* A = GetWorld()->SpawnActor<ACRPropActor>(ACRPropActor::StaticClass(), Loc, FRotator::ZeroRotator, P);
		if (!A) continue;
		FCRShapes::Cyl(A, nullptr, 29.f, 7.f, FVector::ZeroVector, CRCol(58, 62, 44));
		FMine M;
		M.Actor = A;
		M.Led = FCRShapes::Ball(A, nullptr, FVector(3.5f, 3.5f, 3.5f), FVector(0, 0, 5.f), CRCol(255, 40, 0));
		M.Loc = Loc;
		Mines.Add(M);
	}
	for (int32 i = 0; i < L.Kits; ++i)
	{
		const FVector2D S = World->FreeSpot(false, 10.f, 2.f, 70.f);
		const FVector Loc(S.X * 100.f, S.Y * 100.f, World->H(S.X, S.Y) * 100.f + 20.f);
		ACRPropActor* A = GetWorld()->SpawnActor<ACRPropActor>(ACRPropActor::StaticClass(), Loc, FRotator::ZeroRotator, P);
		if (!A) continue;
		FCRShapes::Box(A, nullptr, FVector(50.f, 35.f, 30.f), FVector::ZeroVector, CRCol(232, 232, 224));
		FCRShapes::Box(A, nullptr, FVector(30.f, 10.f, 6.f), FVector(0, 0, 16.f), CRCol(192, 24, 24));
		FCRShapes::Box(A, nullptr, FVector(10.f, 30.f, 6.f), FVector(0, 0, 16.f), CRCol(192, 24, 24));
		FKit K;
		K.Actor = A;
		K.Loc = Loc;
		Kits.Add(K);
	}
	for (int32 i = 0; i < L.Enemies; ++i)
	{
		const FVector2D S = World->FreeSpot(false, 30.f, 1.8f, 72.f);
		const FVector Loc(S.X * 100.f, S.Y * 100.f, World->H(S.X, S.Y) * 100.f + 100.f);
		ACREnemy* E = GetWorld()->SpawnActor<ACREnemy>(ACREnemy::StaticClass(), Loc, FRotator::ZeroRotator, P);
		if (!E) continue;
		E->Setup(L.EnemyHP, L.EnemyAcc);
		Enemies.Add(E);
	}
	// vehicles: APCs on the ground, helicopters in the air, jets wait for their strike
	const FVector PStart(0.f, 7000.f, 0.f);
	for (int32 i = 0; i < L.APCs; ++i)
	{
		const FVector2D S = World->FreeSpot(false, 45.f, 7.f, 70.f);
		const FVector Loc(S.X * 100.f, S.Y * 100.f, World->H(S.X, S.Y) * 100.f + 110.f);
		ACRVehicle* V = GetWorld()->SpawnActor<ACRVehicle>(ACRVehicle::StaticClass(), Loc, FRotator(0.f, FMath::FRandRange(0.f, 360.f), 0.f), P);
		if (!V) continue;
		V->Setup(ACRVehicle::EType::APC, 520.f + 60.f * CurLevel);
		Vehicles.Add(V);
	}
	for (int32 i = 0; i < L.Helis; ++i)
	{
		const float A = FMath::FRand() * 2.f * PI;
		const FVector Loc(FMath::Cos(A) * 9000.f, FMath::Sin(A) * 9000.f + 3000.f, 3500.f);
		ACRVehicle* V = GetWorld()->SpawnActor<ACRVehicle>(ACRVehicle::StaticClass(), Loc, FRotator::ZeroRotator, P);
		if (!V) continue;
		V->Setup(ACRVehicle::EType::Heli, 380.f + 40.f * CurLevel);
		Vehicles.Add(V);
	}
	for (int32 i = 0; i < L.Jets; ++i)
	{
		ACRVehicle* V = GetWorld()->SpawnActor<ACRVehicle>(ACRVehicle::StaticClass(), FVector(0, 0, 8000.f), FRotator::ZeroRotator, P);
		if (!V) continue;
		V->Setup(ACRVehicle::EType::Jet, 300.f);
		Vehicles.Add(V);
	}
	TotalEnemies = Enemies.Num();
	for (ACRVehicle* V : Vehicles) if (V && V->CountsForMission()) ++TotalEnemies;
	Killed = 0;
}

void ACRGameMode::Replay() { StartMission(CurLevel); }
void ACRGameMode::NextMission()
{
	const int32 N = CRData::NextInCampaign(CurLevel);
	if (N >= 0) StartMission(N);
}

void ACRGameMode::TogglePause()
{
	if (State == EState::Playing)
	{
		State = EState::Paused;
		if (ACRPlayerController* PC = GetPC()) PC->SetMenuInput(true);
	}
	else if (State == EState::Paused)
	{
		State = EState::Playing;
		if (ACRPlayerController* PC = GetPC()) PC->SetMenuInput(false);
	}
}

// ---------------- events ----------------
void ACRGameMode::NotifyAlert(const FVector& LocCm, float RadiusM)
{
	for (ACREnemy* E : Enemies)
		if (E && E->bAlive && FVector::Dist(E->GetActorLocation(), LocCm) < RadiusM * 100.f) E->Alert();
}

void ACRGameMode::SpawnGrenade(const FVector& LocCm, const FVector& VelCm, const FCRWeaponDef& W)
{
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	ACRGrenade* G = GetWorld()->SpawnActor<ACRGrenade>(ACRGrenade::StaticClass(), LocCm, FRotator::ZeroRotator, P);
	if (!G) return;
	float Fuse = 2.f, Radius = 7.f;
	switch (W.Kind)
	{
	case ECRKind::Dynamite: Fuse = 3.5f; Radius = 9.f; break;
	case ECRKind::Smoke: Fuse = 1.2f; Radius = 8.f; break;
	case ECRKind::Flash: Fuse = 1.5f; Radius = 15.f; break;
	default: break;
	}
	G->Setup(W.Kind, Fuse, Radius, W.Damage);
	G->Throw(VelCm);
}

void ACRGameMode::SpawnRocket(const FVector& LocCm, const FVector& Dir, bool bNapalm, const FCRWeaponDef& W)
{
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	ACRRocket* R = GetWorld()->SpawnActor<ACRRocket>(ACRRocket::StaticClass(), LocCm, Dir.Rotation(), P);
	if (R) R->Launch(Dir.GetSafeNormal() * (bNapalm ? 2800.f : 4200.f), bNapalm, bNapalm ? 0.f : 8.f, W.Damage, PlayerChar);
}

void ACRGameMode::SpawnArrow(const FVector& LocCm, const FVector& Dir, const FCRWeaponDef& W)
{
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	ACRArrow* A = GetWorld()->SpawnActor<ACRArrow>(ACRArrow::StaticClass(), LocCm, Dir.Rotation(), P);
	if (A) A->Launch(Dir.GetSafeNormal() * 5200.f, W.Damage, PlayerChar, GetPC());
}

void ACRGameMode::SpawnFire(const FVector& LocCm, float Dps)
{
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	if (ACRFireZone* F = GetWorld()->SpawnActor<ACRFireZone>(ACRFireZone::StaticClass(), LocCm, FRotator::ZeroRotator, P))
		F->Init(350.f, 6.f, Dps);
	PlaySfx(ECRSfx::Boom, 0.5f);
}

void ACRGameMode::FireDamage(const FVector& LocCm, float RadiusM, float Dmg)
{
	for (ACREnemy* E : Enemies)
		if (E && E->bAlive && FVector::Dist2D(E->GetActorLocation(), LocCm) < RadiusM * 100.f)
			UGameplayStatics::ApplyDamage(E, Dmg, nullptr, nullptr, UDamageType::StaticClass());
	for (ACRVehicle* V : Vehicles)
		if (V && V->bAlive && V->Type != ACRVehicle::EType::Jet && FVector::Dist2D(V->GetActorLocation(), LocCm) < (RadiusM + 2.f) * 100.f)
			UGameplayStatics::ApplyDamage(V, Dmg, nullptr, nullptr, UDamageType::StaticClass());
	if (PlayerChar && !PlayerChar->bDead && FVector::Dist2D(PlayerChar->GetActorLocation(), LocCm) < RadiusM * 100.f)
		PlayerChar->Hurt(Dmg * 0.5f);
}

void ACRGameMode::AddSmoke(const FVector& LocCm, float RadiusM, float Secs)
{
	FSmoke S;
	S.Loc = LocCm + FVector(0, 0, 150.f);
	S.RadiusCm = RadiusM * 100.f;
	S.EndT = GetWorld()->GetTimeSeconds() + Secs;
	Smokes.Add(S);
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	if (ACRSmokeCloud* C = GetWorld()->SpawnActor<ACRSmokeCloud>(ACRSmokeCloud::StaticClass(), LocCm, FRotator::ZeroRotator, P))
		C->Init(S.RadiusCm, Secs);
	PlaySfx(ECRSfx::Reload, 1.f);
}

bool ACRGameMode::IsSmokeBlocking(const FVector& From, const FVector& To) const
{
	const double Now = GetWorld()->GetTimeSeconds();
	for (const FSmoke& S : Smokes)
	{
		if (S.EndT < Now) continue;
		if (FMath::PointDistToSegment(S.Loc, From, To) < S.RadiusCm * 0.7f) return true;
	}
	return false;
}

void ACRGameMode::Flash(const FVector& LocCm, float RadiusM, float Secs)
{
	PlaySfx(ECRSfx::Boom, 0.6f);
	ACRParticles::Burst(GetWorld(), LocCm + FVector(0, 0, 80.f), CRCol(255, 255, 245), 18, 600.f, 0.5f, 14.f, 900000.f, 5000.f);
	for (ACREnemy* E : Enemies)
		if (E && E->bAlive && FVector::Dist(E->GetActorLocation(), LocCm) < RadiusM * 100.f) E->Stun(Secs);
	if (PlayerChar && !PlayerChar->bDead)
	{
		const FVector To = LocCm - PlayerChar->GetActorLocation();
		const float D = To.Size() / 100.f;
		if (D < RadiusM * 0.7f && FVector::DotProduct(To.GetSafeNormal(), PlayerChar->Camera->GetForwardVector()) > -0.2f)
			FlashAlpha = 1.f;
	}
}

void ACRGameMode::StunCone(const FVector& LocCm, const FVector& Dir, float RangeM, float HalfDeg, float Secs, float Dmg)
{
	PlaySfx(ECRSfx::Heavy, 1.f);
	const float CosMin = FMath::Cos(FMath::DegreesToRadians(HalfDeg));
	ACRParticles::Burst(GetWorld(), LocCm + Dir * 200.f, CRCol(110, 190, 255), 14, 900.f, 0.4f, 9.f);
	for (ACREnemy* E : Enemies)
	{
		if (!E || !E->bAlive) continue;
		const FVector To = E->GetActorLocation() - LocCm;
		if (To.Size() > RangeM * 100.f) continue;
		if (FVector::DotProduct(To.GetSafeNormal(), Dir.GetSafeNormal()) < CosMin) continue;
		E->Stun(Secs);
		UGameplayStatics::ApplyDamage(E, Dmg, nullptr, nullptr, UDamageType::StaticClass());
	}
}

void ACRGameMode::Explode(const FVector& LocCm, float RadiusM, float Damage)
{
	PlaySfx(ECRSfx::Boom, 1.f);
	ACRParticles::Burst(GetWorld(), LocCm + FVector(0, 0, 40.f), CRCol(70, 56, 42), 30, 700.f, 1.0f, 12.f, 400000.f, 3000.f);
	ACRParticles::Burst(GetWorld(), LocCm + FVector(0, 0, 60.f), CRCol(255, 170, 60), 14, 500.f, 0.35f, 22.f);
	for (ACREnemy* E : Enemies)
	{
		if (!E || !E->bAlive) continue;
		const float D = FVector::Dist2D(E->GetActorLocation(), LocCm) / 100.f;
		if (D < RadiusM)
			UGameplayStatics::ApplyDamage(E, Damage * (1.f - D / (RadiusM + 1.f)), nullptr, nullptr, UDamageType::StaticClass());
	}
	for (ACRVehicle* V : Vehicles)
	{
		if (!V || !V->bAlive) continue;
		const float D = FMath::Max(0.f, FVector::Dist(V->GetActorLocation(), LocCm) / 100.f - 3.f);
		if (D < RadiusM)
			UGameplayStatics::ApplyDamage(V, Damage * 1.6f * (1.f - D / (RadiusM + 1.f)), nullptr, nullptr, UDamageType::StaticClass());
	}
	if (PlayerChar && !PlayerChar->bDead)
	{
		const float D = FVector::Dist(PlayerChar->GetActorLocation(), LocCm) / 100.f;
		if (D < RadiusM) PlayerChar->Hurt(Damage * 0.6f * (1.f - D / (RadiusM + 1.f)));
	}
}

void ACRGameMode::OnEnemyKilled(ACREnemy* E)
{
	if (State == EState::Ended) return;
	++Killed;
	UCRGameInstance* G = GI();
	if (G && G->Profile) G->Profile->Kills++;
	if (PlayerChar && PlayerChar->SlotIds.Num() > 0)
	{
		const FCRWeaponDef* D = CRData::GetWeapon(PlayerChar->SlotIds[0]);
		if (D) PlayerChar->Ammo.FindOrAdd(D->Id).Res += FMath::CeilToInt(D->Mag / 2.f);
	}
	CheckWin();
}

void ACRGameMode::CheckWin()
{
	if (State == EState::Playing && Killed >= TotalEnemies) Finish(true);
}

void ACRGameMode::OnVehicleKilled(ACRVehicle* V)
{
	if (State == EState::Ended) return;
	if (!V->CountsForMission())
	{
		Say(TEXT("Jet shot down!"), 2.5f);
		return;
	}
	++Killed;
	Say(V->Type == ACRVehicle::EType::APC ? TEXT("APC destroyed!") : TEXT("Helicopter shot down!"), 2.f);
	CheckWin();
}

void ACRGameMode::OnPlayerDied()
{
	if (State == EState::Ended) return;
	Finish(false);
}

void ACRGameMode::Finish(bool bWin)
{
	State = EState::Ended;
	UCRGameInstance* G = GI();
	const FCRLevelDef& L = CRData::Levels()[CurLevel];
	if (G && G->Profile)
	{
		if (bWin)
		{
			G->Profile->MissionsDone++;
			G->Profile->Weapoints += L.RewardWP;
			G->Profile->Medals += L.RewardMedals;
			G->Profile->XP += L.RewardXP;
			const int32 Nx = CRData::NextInCampaign(CurLevel);
			bEndHasNext = Nx >= 0;
			const int32 Camp = L.Campaign;
			if (bEndHasNext) G->Profile->SetMax(Camp, FMath::Max(G->Profile->GetMax(Camp), CRData::IndexInCampaign(CurLevel) + 1));
		}
		else
		{
			G->Profile->Deaths++;
			G->Profile->Weapoints += 10;
			bEndHasNext = false;
		}
		G->SaveProfile();
	}
	if (bWin)
	{
		EndTitle = TEXT("Mission complete");
		EndText = FString::Printf(TEXT("%sReward: %d Weapoints, %d medals, %d XP."), bEndHasNext ? TEXT("The next mission is unlocked. ") : TEXT("The campaign ends in this version. "), L.RewardWP, L.RewardMedals, L.RewardXP);
	}
	else
	{
		EndTitle = TEXT("You died");
		EndText = TEXT("Mission failed. You get 10 Weapoints for the effort.");
	}
	if (ACRPlayerController* PC = GetPC()) PC->SetMenuInput(true);
}

// ---------------- loop ----------------
void ACRGameMode::TickMines(float Dt)
{
	if (!PlayerChar) return;
	const double T = GetWorld()->GetTimeSeconds();
	float Near = 1e9f;
	const FVector PL = PlayerChar->GetActorLocation();
	for (FMine& M : Mines)
	{
		if (!M.bLive) continue;
		if (M.Led) M.Led->SetVisibility(FMath::Fmod((float)T, 1.f) < 0.5f);
		const float Dp = FVector::Dist2D(PL, M.Loc) / 100.f;
		Near = FMath::Min(Near, Dp);
		bool bTrig = Dp < 1.1f && PL.Z - M.Loc.Z < 190.f;
		if (!bTrig)
		{
			for (ACREnemy* E : Enemies)
				if (E && E->bAlive && FVector::Dist2D(E->GetActorLocation(), M.Loc) < 90.f) { bTrig = true; break; }
		}
		if (bTrig)
		{
			M.bLive = false;
			if (M.Actor.IsValid()) M.Actor->Destroy();
			Explode(M.Loc + FVector(0, 0, 30.f), 6.f, 150.f);
			if (Dp < 1.1f) Say(TEXT("You stepped on a mine"), 1.5f);
		}
	}
	NearMineM = Near < 6.f ? Near : -1.f;
	if (NearMineM >= 0.f)
	{
		const float Period = Near < 3.f ? 0.17f : 0.33f;
		if (T - LastBeep > Period) { LastBeep = (float)T; PlaySfx(ECRSfx::Beep, 0.4f); }
	}
	for (FKit& K : Kits)
	{
		if (K.bUsed) continue;
		if (FVector::Dist2D(PL, K.Loc) < 130.f && PlayerChar->Health < 100.f)
		{
			K.bUsed = true;
			if (K.Actor.IsValid()) K.Actor->Destroy();
			PlayerChar->Heal(40.f);
			Say(TEXT("Medkit +40 HP"), 1.5f);
			PlaySfx(ECRSfx::Kit, 1.f);
		}
	}
}

void ACRGameMode::Tick(float Dt)
{
	Super::Tick(Dt);
	if (MsgT > 0.f)
	{
		MsgT -= Dt;
		if (MsgT <= 0.f) Msg.Empty();
	}
	if (State == EState::Menu && MenuCam && World)
	{
		MenuAngle += Dt * 0.05f;
		const float R = 6500.f;
		const FVector C(0.f, 0.f, World->H(0.f, 0.f) * 100.f + 900.f);
		const FVector Pos(FMath::Cos(MenuAngle) * R, FMath::Sin(MenuAngle) * R, C.Z + 1600.f);
		MenuCam->SetActorLocation(Pos);
		MenuCam->SetActorRotation((C - Pos).Rotation());
	}
	if (FlashAlpha > 0.f) FlashAlpha = FMath::Max(0.f, FlashAlpha - Dt * 0.3f);
	if (State == EState::Playing) TickMines(Dt);
}
