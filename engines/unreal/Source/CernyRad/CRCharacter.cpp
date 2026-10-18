#include "CRCharacter.h"
#include "CRUtil.h"
#include "CRFx.h"
#include "CREnemy.h"
#include "CRVehicle.h"
#include "CRGameInstance.h"
#include "CRGameMode.h"
#include "CRHUD.h"
#include "CRSaveGame.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DamageEvents.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/DamageType.h"
#include "Kismet/GameplayStatics.h"

ACRCharacter::ACRCharacter()
{
	PrimaryActorTick.bCanEverTick = true;
	GetCapsuleComponent()->InitCapsuleSize(38.f, 90.f);
	GetCapsuleComponent()->SetCollisionResponseToChannel(ECC_Visibility, ECR_Ignore);

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	Camera->SetupAttachment(GetCapsuleComponent());
	Camera->SetRelativeLocation(FVector(0.f, 0.f, 70.f));
	Camera->bUsePawnControlRotation = true;

	ViewRoot = CreateDefaultSubobject<USceneComponent>(TEXT("ViewRoot"));
	ViewRoot->SetupAttachment(Camera);
	ViewRoot->SetRelativeLocation(ViewBase);

	FlashLight = CreateDefaultSubobject<UPointLightComponent>(TEXT("FlashLight"));
	FlashLight->SetupAttachment(ViewRoot);
	FlashLight->SetIntensity(0.f);
	FlashLight->SetAttenuationRadius(900.f);
	FlashLight->SetLightColor(FLinearColor(1.f, 0.7f, 0.35f));
	FlashLight->SetCastShadows(false);

	bUseControllerRotationYaw = true;
	GetCharacterMovement()->MaxWalkSpeed = 460.f;
	GetCharacterMovement()->JumpZVelocity = 520.f;
	GetCharacterMovement()->AirControl = 0.35f;
	GetCharacterMovement()->GravityScale = 1.6f;
	if (GetMesh()) GetMesh()->SetVisibility(false);
}

void ACRCharacter::InitFromProfile()
{
	UCRGameInstance* GI = GetGameInstance<UCRGameInstance>();
	FName Prim = TEXT("hk416"), Sec = TEXT("glock"), Mel = TEXT("knife"), Gren = TEXT("m67");
	if (GI && GI->Profile)
	{
		Prim = GI->Profile->EquippedPrimary;
		Sec = GI->Profile->EquippedSecondary;
		Mel = GI->Profile->EquippedMelee;
		Gren = GI->Profile->EquippedGrenade;
		BaseFOV = GI->Profile->FOV;
		Sens = GI->Profile->MouseSensitivity;
	}
	Camera->SetFieldOfView(BaseFOV);
	SlotIds = { Prim, Sec, Mel, Gren };
	// campaign with vehicles: extra RPG on key 5
	if (GI && CRData::Levels().IsValidIndex(GI->CurrentLevel) && CRData::Levels()[GI->CurrentLevel].Campaign == 1 && Prim != TEXT("rpg"))
		SlotIds.Add(FName(TEXT("rpg")));
	Ammo.Empty();
	for (const FName& Id : SlotIds)
	{
		const FCRWeaponDef* D = CRData::GetWeapon(Id);
		if (D && D->Mag > 0)
		{
			FAmmo A; A.Mag = D->Mag; A.Res = (Id == TEXT("rpg") && Id != Prim) ? 3 : D->Reserve;
			Ammo.Add(Id, A);
		}
	}
	Nades = 3;
	Health = 100.f;
	bDead = false;
	EquipSlot(0);
}

const FCRWeaponDef* ACRCharacter::CurDef() const
{
	return SlotIds.IsValidIndex(CurSlot) ? CRData::GetWeapon(SlotIds[CurSlot]) : nullptr;
}

bool ACRCharacter::IsScoped() const
{
	const FCRWeaponDef* W = CurDef();
	return bAiming && W && W->bScoped;
}

void ACRCharacter::EquipSlot(int32 Index)
{
	if (!SlotIds.IsValidIndex(Index) || bDead) return;
	CurSlot = Index;
	ReloadT = 0.f;
	BuildView();
}

void ACRCharacter::BuildView()
{
	for (UPrimitiveComponent* C : ViewComps) if (C) C->DestroyComponent();
	ViewComps.Empty();
	MuzzleBall = nullptr;
	const FName Id = SlotIds[CurSlot];
	GunInfo = CRBuildGun(this, ViewRoot, Id, true, &ViewComps);
	CRAddHands(this, ViewRoot, GunInfo, true, &ViewComps);
	if (GunInfo.bHasMuzzle)
	{
		MuzzleBall = FCRShapes::Ball(this, ViewRoot, FVector(2.5f, 2.5f, 2.5f), GunInfo.Muzzle, CRCol(255, 220, 120));
		if (MuzzleBall) { MuzzleBall->SetVisibility(false); ViewComps.Add(MuzzleBall); }
		FlashLight->SetRelativeLocation(GunInfo.Muzzle);
	}
	for (UPrimitiveComponent* C : ViewComps)
	{
		if (!C) continue;
		C->SetOnlyOwnerSee(true);
		C->SetCastShadow(false);
		C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	}
	if (Id == TEXT("knife") || Id == TEXT("machete") || Id == TEXT("hammer")) ViewBase = FVector(28.f, 20.f, -22.f);
	else if (Id == TEXT("m67") || Id == TEXT("dynamite") || Id == TEXT("smoke") || Id == TEXT("flash")) ViewBase = FVector(30.f, 20.f, -22.f);
	else if (Id == TEXT("glock") || Id == TEXT("revolver") || Id == TEXT("dpistol") || Id == TEXT("napalm") || Id == TEXT("hardbass")) ViewBase = FVector(35.f, 14.f, -17.f);
	else if (Id == TEXT("shotgun")) ViewBase = FVector(28.f, 16.f, -20.f);
	else if (Id == TEXT("svd")) ViewBase = FVector(30.f, 16.f, -20.f);
	else if (Id == TEXT("shield")) ViewBase = FVector(42.f, 4.f, -8.f);
	else if (Id == TEXT("bow") || Id == TEXT("crossbow")) ViewBase = FVector(34.f, 16.f, -17.f);
	else if (Id == TEXT("rpg")) ViewBase = FVector(26.f, 18.f, -22.f);
	else ViewBase = FVector(28.f, 16.f, -19.f);
	ViewRoot->SetRelativeLocation(ViewBase);
}

void ACRCharacter::Tick(float Dt)
{
	Super::Tick(Dt);
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	if (!GM || bDead) return;
	const bool bFrozen = GM->IsFrozen();
	const FCRWeaponDef* W = CurDef();

	bMoving = !bFrozen && GetVelocity().Size2D() > 50.f;
	GetCharacterMovement()->MaxWalkSpeed = (bSprint ? 750.f : 460.f) * (bAiming ? 0.6f : 1.f);

	if (!bFrozen && W)
	{
		if (bFireHeld && W->bAuto) Fire(false);
		if (ReloadT > 0.f)
		{
			ReloadT -= Dt;
			if (ReloadT <= 0.f)
			{
				FAmmo& A = Ammo.FindOrAdd(SlotIds[CurSlot]);
				const int32 Take = FMath::Min(W->Mag - A.Mag, A.Res);
				A.Mag += Take;
				A.Res -= Take;
			}
		}
	}
	// zoom
	float TargetFov = BaseFOV;
	if (bAiming && W) TargetFov = BaseFOV / (W->Zoom * (W->bScoped ? 1.8f : 1.3f));
	Camera->SetFieldOfView(FMath::FInterpTo(Camera->FieldOfView, TargetFov, Dt, 14.f));

	// flash
	if (FlashT > 0.f)
	{
		FlashT -= Dt;
		if (FlashT <= 0.f)
		{
			FlashLight->SetIntensity(0.f);
			if (MuzzleBall) MuzzleBall->SetVisibility(false);
		}
	}
	// weapon animation
	KickAmt = FMath::FInterpTo(KickAmt, 0.f, Dt, 14.f);
	BobT += Dt * (bSprint ? 14.f : 9.f) * (bMoving ? 1.f : 0.f);
	FVector Target = ViewBase;
	float TiltPitch = 0.f;
	if (ReloadT > 0.f)
	{
		const float Q = 1.f - ReloadT / ReloadMax;
		TiltPitch = -40.f * FMath::Sin(PI * Q);
		Target.Z -= 12.f * FMath::Sin(PI * Q);
	}
	if (bAiming && GunInfo.SightZ > 0.f)
	{
		Target.Y = 0.f;
		Target.Z = -GunInfo.SightZ - 1.2f;
	}
	if (bMoving && !bAiming)
	{
		Target.Y += FMath::Sin(BobT) * 1.2f;
		Target.Z += FMath::Abs(FMath::Sin(BobT)) * 1.2f;
	}
	Target.X -= KickAmt;
	const FVector Cur = ViewRoot->GetRelativeLocation();
	ViewRoot->SetRelativeLocation(FMath::VInterpTo(Cur, Target, Dt, 18.f));
	ViewRoot->SetRelativeRotation(FRotator(TiltPitch + KickAmt * 0.6f, 0.f, 0.f));
}

void ACRCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
	Super::SetupPlayerInputComponent(Input);
	Input->BindAxis("MoveForward", this, &ACRCharacter::MoveForward);
	Input->BindAxis("MoveRight", this, &ACRCharacter::MoveRight);
	Input->BindAxis("Turn", this, &ACRCharacter::Turn);
	Input->BindAxis("LookUp", this, &ACRCharacter::LookUp);
	Input->BindAction("Jump", IE_Pressed, this, &ACharacter::Jump);
	Input->BindAction("Jump", IE_Released, this, &ACharacter::StopJumping);
	Input->BindAction("Sprint", IE_Pressed, this, &ACRCharacter::SprintOn);
	Input->BindAction("Sprint", IE_Released, this, &ACRCharacter::SprintOff);
	Input->BindAction("Aim", IE_Pressed, this, &ACRCharacter::AimOn);
	Input->BindAction("Aim", IE_Released, this, &ACRCharacter::AimOff);
	Input->BindAction("Fire", IE_Pressed, this, &ACRCharacter::FireOn);
	Input->BindAction("Fire", IE_Released, this, &ACRCharacter::FireOff);
	Input->BindAction("Reload", IE_Pressed, this, &ACRCharacter::ReloadPressed);
	Input->BindAction("Slot1", IE_Pressed, this, &ACRCharacter::Slot1);
	Input->BindAction("Slot2", IE_Pressed, this, &ACRCharacter::Slot2);
	Input->BindAction("Slot3", IE_Pressed, this, &ACRCharacter::Slot3);
	Input->BindAction("Slot4", IE_Pressed, this, &ACRCharacter::Slot4);
	Input->BindAction("Slot5", IE_Pressed, this, &ACRCharacter::Slot5);
}

static bool Frozen(const UObject* Ctx)
{
	const ACRGameMode* GM = Ctx->GetWorld() ? Ctx->GetWorld()->GetAuthGameMode<ACRGameMode>() : nullptr;
	return !GM || GM->IsFrozen();
}

void ACRCharacter::MoveForward(float V) { if (V != 0.f && !bDead && !Frozen(this)) AddMovementInput(GetActorForwardVector(), V); }
void ACRCharacter::MoveRight(float V) { if (V != 0.f && !bDead && !Frozen(this)) AddMovementInput(GetActorRightVector(), V); }
void ACRCharacter::Turn(float V) { if (!bDead && !Frozen(this)) AddControllerYawInput(V * Sens * (bAiming ? 0.5f : 1.f)); }
void ACRCharacter::LookUp(float V) { if (!bDead && !Frozen(this)) AddControllerPitchInput(V * Sens * (bAiming ? 0.5f : 1.f)); }

void ACRCharacter::StartReload()
{
	const FCRWeaponDef* W = CurDef();
	if (!W || W->Mag <= 0 || ReloadT > 0.f || bDead || Frozen(this)) return;
	FAmmo& A = Ammo.FindOrAdd(SlotIds[CurSlot]);
	if (A.Mag >= W->Mag || A.Res <= 0) return;
	ReloadMax = W->ReloadTime;
	ReloadT = ReloadMax;
	if (ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>()) GM->PlaySfx(ECRSfx::Reload, 1.f);
}

void ACRCharacter::Fire(bool bFirst)
{
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	const FCRWeaponDef* W = CurDef();
	if (!GM || !W || bDead || GM->IsFrozen()) return;
	const double Now = GetWorld()->GetTimeSeconds();
	if (ReloadT > 0.f || Now - LastShot < W->Rate) return;
	const FVector Fwd = Camera->GetForwardVector();
	const FVector CamLoc = Camera->GetComponentLocation();
	AController* C = GetController();

	// weapons without ammo: grenades, melee, shield
	switch (W->Kind)
	{
	case ECRKind::Frag:
	case ECRKind::Dynamite:
	case ECRKind::Smoke:
	case ECRKind::Flash:
		if (Nades <= 0) return;
		--Nades;
		LastShot = Now;
		KickAmt = -8.f;
		GM->SpawnGrenade(CamLoc + Fwd * 60.f, Fwd * 1800.f + FVector(0.f, 0.f, 300.f), *W);
		return;
	case ECRKind::Melee:
	case ECRKind::Shield:
	{
		LastShot = Now;
		KickAmt = -12.f;
		GM->PlaySfx(ECRSfx::Knife, 1.f);
		FHitResult Hit;
		FCollisionQueryParams P(SCENE_QUERY_STAT(MeleeTrace), true, this);
		if (GetWorld()->SweepSingleByChannel(Hit, CamLoc, CamLoc + Fwd * (W->Kind == ECRKind::Shield ? 200.f : 240.f), FQuat::Identity, ECC_Visibility, FCollisionShape::MakeSphere(40.f), P))
		{
			if (AActor* A = Hit.GetActor())
			{
				UGameplayStatics::ApplyPointDamage(A, W->Damage, Fwd, Hit, C, this, UDamageType::StaticClass());
				if (W->Kind == ECRKind::Shield) { if (ACREnemy* E = Cast<ACREnemy>(A)) E->Stun(1.5f); }
			}
		}
		return;
	}
	default: break;
	}

	// bayonet: stabs at close range instead of firing
	if (W->bBayonet)
	{
		FHitResult Hit;
		FCollisionQueryParams P(SCENE_QUERY_STAT(BayonetTrace), true, this);
		if (GetWorld()->SweepSingleByChannel(Hit, CamLoc, CamLoc + Fwd * 220.f, FQuat::Identity, ECC_Visibility, FCollisionShape::MakeSphere(35.f), P) && Cast<ACREnemy>(Hit.GetActor()))
		{
			LastShot = Now;
			KickAmt = -10.f;
			GM->PlaySfx(ECRSfx::Knife, 1.f);
			UGameplayStatics::ApplyPointDamage(Hit.GetActor(), 90.f, Fwd, Hit, C, this, UDamageType::StaticClass());
			return;
		}
	}

	// weapons with ammo
	FAmmo& A = Ammo.FindOrAdd(W->Id);
	if (A.Mag <= 0)
	{
		StartReload();
		return;
	}
	if (!W->bAuto && !bFirst) return;
	--A.Mag;
	LastShot = Now;
	KickAmt = 5.f;

	switch (W->Kind)
	{
	case ECRKind::Rocket:
		KickAmt = 14.f;
		GM->PlaySfx(ECRSfx::Heavy, 1.f);
		GM->NotifyAlert(GetActorLocation(), 60.f);
		GM->SpawnRocket(CamLoc + Fwd * 80.f, Fwd, false, *W);
		if (A.Mag <= 0) StartReload();
		return;
	case ECRKind::Napalm:
		KickAmt = 8.f;
		GM->PlaySfx(ECRSfx::Pistol, 1.f);
		GM->SpawnRocket(CamLoc + Fwd * 60.f, Fwd + FVector(0.f, 0.f, 0.12f), true, *W);
		if (A.Mag <= 0) StartReload();
		return;
	case ECRKind::Arrow:
		KickAmt = 6.f;
		GM->PlaySfx(ECRSfx::Knife, 0.6f);
		GM->SpawnArrow(CamLoc + Fwd * 50.f, Fwd, *W);
		if (A.Mag <= 0) StartReload();
		return;
	case ECRKind::Stun:
		KickAmt = 7.f;
		GM->StunCone(CamLoc, Fwd, 15.f, 28.f, 2.5f, W->Damage);
		if (A.Mag <= 0) StartReload();
		return;
	default: break;
	}

	FlashT = 0.05f;
	FlashLight->SetIntensity(30000.f);
	if (MuzzleBall) MuzzleBall->SetVisibility(true);
	GM->PlaySfx(W->Damage > 60.f ? ECRSfx::Heavy : (W->Slot == ECRSlot::Secondary ? ECRSfx::Pistol : ECRSfx::Rifle), 1.f);
	GM->NotifyAlert(GetActorLocation(), 50.f);

	if (!C) return;
	FVector Start; FRotator Rot;
	C->GetPlayerViewPoint(Start, Rot);
	const float Spread = W->SpreadDeg * (bAiming ? 0.35f : 1.f);
	FCollisionQueryParams P(SCENE_QUERY_STAT(WeaponTrace), true, this);
	for (int32 i = 0; i < FMath::Max(1, W->Pellets); ++i)
	{
		const FVector Dir = FMath::VRandCone(Rot.Vector(), FMath::DegreesToRadians(Spread));
		FHitResult Hit;
		if (GetWorld()->LineTraceSingleByChannel(Hit, Start, Start + Dir * 25000.f, ECC_Visibility, P))
		{
			AActor* HA = Hit.GetActor();
			if (Cast<ACREnemy>(HA) || Cast<ACRVehicle>(HA))
				UGameplayStatics::ApplyPointDamage(HA, W->Damage, Dir, Hit, C, this, UDamageType::StaticClass());
			else if (i < 3)
				ACRParticles::Burst(GetWorld(), Hit.ImpactPoint, CRCol(150, 142, 128), 7, 300.f, 0.6f, 5.f);
		}
	}
	AddControllerPitchInput(-(0.25f + (W->Pellets > 1 ? 1.f : 0.f)) * FMath::FRandRange(0.7f, 1.3f));
	AddControllerYawInput(FMath::FRandRange(-0.08f, 0.08f));
	if (A.Mag <= 0) StartReload();
}

float ACRCharacter::TakeDamage(float Damage, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser)
{
	if (bDead) return 0.f;
	float Actual = Super::TakeDamage(Damage, DamageEvent, EventInstigator, DamageCauser);
	// the shield blocks bullets from the front
	const FCRWeaponDef* W = CurDef();
	if (W && W->Kind == ECRKind::Shield && DamageCauser)
	{
		const FVector To = (DamageCauser->GetActorLocation() - GetActorLocation()).GetSafeNormal2D();
		if (FVector::DotProduct(To, GetActorForwardVector()) > 0.3f) Actual *= 0.15f;
	}
	if (Actual > 0.f) Hurt(Actual);
	return Actual;
}

void ACRCharacter::Hurt(float V)
{
	if (bDead) return;
	Health -= V;
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	if (GM)
	{
		GM->PlaySfx(ECRSfx::Hurt, 1.f);
		GM->AddBlood(V);
	}
	if (Health <= 0.f)
	{
		bDead = true;
		bFireHeld = false;
		if (GM) GM->OnPlayerDied();
	}
}

void ACRCharacter::Heal(float V)
{
	Health = FMath::Min(100.f, Health + V);
}
