#include "CRVehicle.h"
#include "CRUtil.h"
#include "CRFx.h"
#include "CRCharacter.h"
#include "CREnemy.h"
#include "CRGameMode.h"
#include "CRWorldActor.h"
#include "Camera/CameraComponent.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DamageEvents.h"
#include "GameFramework/DamageType.h"
#include "Kismet/GameplayStatics.h"

ACRVehicle::ACRVehicle()
{
	PrimaryActorTick.bCanEverTick = true;
	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	SetRootComponent(Body);
}

UPrimitiveComponent* ACRVehicle::Part(UPrimitiveComponent* C)
{
	if (!C) return nullptr;
	FCRShapes::HitPart(C);
	C->ComponentTags.Add(TEXT("Armor"));
	Parts.Add(C);
	return C;
}

USceneComponent* ACRVehicle::Pivot(USceneComponent* Parent, const FVector& Loc)
{
	USceneComponent* P = NewObject<USceneComponent>(this);
	P->SetupAttachment(Parent ? Parent : GetRootComponent());
	P->SetRelativeLocation(Loc);
	P->RegisterComponent();
	return P;
}

void ACRVehicle::Setup(EType T, float Hp)
{
	Type = T;
	Health = MaxHealth = Hp;
	Body->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
	Body->SetCollisionObjectType(ECC_WorldDynamic);
	Body->SetCollisionResponseToAllChannels(ECR_Block);
	Body->SetCollisionResponseToChannel(ECC_Visibility, ECR_Ignore);
	Body->SetCollisionResponseToChannel(ECC_Camera, ECR_Ignore);
	switch (T)
	{
	case EType::APC: PointMul = 0.06f; Body->SetBoxExtent(FVector(330.f, 150.f, 110.f)); BuildAPC(); break;
	case EType::Heli: PointMul = 0.22f; Body->SetBoxExtent(FVector(300.f, 110.f, 110.f)); BuildHeli(); break;
	case EType::Jet: PointMul = 0.02f; Body->SetBoxExtent(FVector(700.f, 300.f, 70.f)); BuildJet(); break;
	}
}

void ACRVehicle::BuildAPC()
{
	USceneComponent* R = Body;
	const FLinearColor Olive = CRCol(72, 84, 56), Dark = CRCol(20, 20, 20), Gun = CRCol(24, 24, 26);
	Part(FCRShapes::Box(this, R, FVector(650.f, 280.f, 100.f), FVector(0, 0, -20.f), Olive));
	Part(FCRShapes::Box(this, R, FVector(380.f, 250.f, 70.f), FVector(-60.f, 0, 55.f), CRCol(66, 78, 52)));
	Part(FCRShapes::Box(this, R, FVector(150.f, 270.f, 90.f), FVector(330.f, 0, 5.f), Olive, FRotator(-28.f, 0.f, 0.f)));
	Part(FCRShapes::Box(this, R, FVector(500.f, 20.f, 14.f), FVector(-20.f, 142.f, 10.f), Dark));
	Part(FCRShapes::Box(this, R, FVector(500.f, 20.f, 14.f), FVector(-20.f, -142.f, 10.f), Dark));
	const float Ax[4] = { -230.f, -80.f, 70.f, 220.f };
	for (int32 i = 0; i < 4; ++i)
		for (int32 s = -1; s <= 1; s += 2)
			Part(FCRShapes::Cyl(this, R, 40.f, 45.f, FVector(Ax[i], s * 150.f, -70.f), Dark, FRotator(0.f, 0.f, 90.f)));
	Turret = Pivot(R, FVector(-20.f, 0.f, 100.f));
	Part(FCRShapes::Box(this, Turret, FVector(120.f, 110.f, 40.f), FVector(0, 0, 20.f), CRCol(62, 74, 50)));
	Part(FCRShapes::Cyl(this, Turret, 4.5f, 160.f, FVector(110.f, 0, 22.f), Gun, FRotator(90.f, 0.f, 0.f)));
	Muzzle = FCRShapes::Ball(this, Turret, FVector(7.f, 7.f, 7.f), FVector(195.f, 0, 22.f), CRCol(255, 220, 120));
	if (Muzzle) { Muzzle->SetVisibility(false); Muzzle->SetCollisionEnabled(ECollisionEnabled::NoCollision); }
	Part(FCRShapes::Box(this, R, FVector(40.f, 4.f, 40.f), FVector(80.f, 126.f, 40.f), CRCol(190, 30, 30)));
	Part(FCRShapes::Box(this, R, FVector(40.f, 4.f, 40.f), FVector(80.f, -126.f, 40.f), CRCol(190, 30, 30)));
}

void ACRVehicle::BuildHeli()
{
	USceneComponent* R = Body;
	const FLinearColor Gray = CRCol(60, 70, 62), Dark = CRCol(20, 22, 22);
	Part(FCRShapes::Ball(this, R, FVector(300.f, 100.f, 110.f), FVector::ZeroVector, Gray));
	Part(FCRShapes::Ball(this, R, FVector(110.f, 90.f, 75.f), FVector(190.f, 0, 25.f), CRCol(30, 50, 70)));
	Part(FCRShapes::Box(this, R, FVector(420.f, 30.f, 30.f), FVector(-420.f, 0, 25.f), CRCol(56, 64, 56)));
	Part(FCRShapes::Box(this, R, FVector(50.f, 8.f, 110.f), FVector(-620.f, 0, 70.f), Gray));
	TailRotor = Pivot(R, FVector(-630.f, 18.f, 80.f));
	Part(FCRShapes::Box(this, TailRotor, FVector(10.f, 4.f, 130.f), FVector::ZeroVector, Dark));
	Part(FCRShapes::Box(this, TailRotor, FVector(130.f, 4.f, 10.f), FVector::ZeroVector, Dark));
	Part(FCRShapes::Cyl(this, R, 8.f, 50.f, FVector(0, 0, 125.f), Dark));
	Rotor = Pivot(R, FVector(0, 0, 155.f));
	Part(FCRShapes::Box(this, Rotor, FVector(720.f, 22.f, 4.f), FVector::ZeroVector, Dark));
	Part(FCRShapes::Box(this, Rotor, FVector(22.f, 720.f, 4.f), FVector::ZeroVector, Dark));
	for (int32 s = -1; s <= 1; s += 2)
	{
		Part(FCRShapes::Box(this, R, FVector(380.f, 10.f, 10.f), FVector(0, s * 95.f, -125.f), Dark));
		Part(FCRShapes::Box(this, R, FVector(8.f, 8.f, 60.f), FVector(90.f, s * 90.f, -95.f), Dark));
		Part(FCRShapes::Box(this, R, FVector(8.f, 8.f, 60.f), FVector(-90.f, s * 90.f, -95.f), Dark));
		Part(FCRShapes::Box(this, R, FVector(100.f, 30.f, 30.f), FVector(60.f, s * 130.f, -20.f), Gray));
	}
	Part(FCRShapes::Cyl(this, R, 6.f, 90.f, FVector(260.f, 0, -75.f), Dark, FRotator(90.f, 0.f, 0.f)));
	Muzzle = FCRShapes::Ball(this, R, FVector(8.f, 8.f, 8.f), FVector(315.f, 0, -75.f), CRCol(255, 220, 120));
	if (Muzzle) { Muzzle->SetVisibility(false); Muzzle->SetCollisionEnabled(ECollisionEnabled::NoCollision); }
}

void ACRVehicle::BuildJet()
{
	USceneComponent* R = Body;
	const FLinearColor Gray = CRCol(105, 110, 118), Dark = CRCol(28, 28, 30);
	Part(FCRShapes::Cyl(this, R, 55.f, 1300.f, FVector::ZeroVector, Gray, FRotator(90.f, 0.f, 0.f)));
	Part(FCRShapes::Ball(this, R, FVector(170.f, 55.f, 55.f), FVector(650.f, 0, 0), Gray));
	Part(FCRShapes::Ball(this, R, FVector(150.f, 32.f, 30.f), FVector(330.f, 0, 45.f), CRCol(30, 50, 70)));
	for (int32 s = -1; s <= 1; s += 2)
	{
		Part(FCRShapes::Box(this, R, FVector(450.f, 520.f, 10.f), FVector(-100.f, s * 260.f, -5.f), Gray, FRotator(0.f, -s * 22.f, 0.f)));
		Part(FCRShapes::Box(this, R, FVector(160.f, 10.f, 200.f), FVector(-560.f, s * 45.f, 100.f), Gray, FRotator(0.f, 0.f, s * 10.f)));
	}
	Part(FCRShapes::Box(this, R, FVector(170.f, 380.f, 8.f), FVector(-620.f, 0, 10.f), Gray));
	Part(FCRShapes::Cyl(this, R, 45.f, 80.f, FVector(-680.f, 0, 0), Dark, FRotator(90.f, 0.f, 0.f)));
}

float ACRVehicle::TakeDamage(float Damage, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser)
{
	if (!bAlive) return 0.f;
	float Actual = Super::TakeDamage(Damage, DamageEvent, EventInstigator, DamageCauser);
	if (DamageEvent.IsOfType(FPointDamageEvent::ClassID)) Actual *= PointMul;
	Health -= Actual;
	if (ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>())
		if (DamageEvent.IsOfType(FPointDamageEvent::ClassID)) GM->HitMarker();
	if (Health <= 0.f) Die();
	return Actual;
}

void ACRVehicle::Die()
{
	bAlive = false;
	Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	for (UPrimitiveComponent* P : Parts) if (P) P->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	if (Type == EType::APC)
	{
		ACRParticles::Burst(GetWorld(), GetActorLocation() + FVector(0, 0, 100.f), CRCol(255, 160, 50), 24, 700.f, 0.9f, 20.f, 500000.f, 3500.f);
		ACRParticles::Burst(GetWorld(), GetActorLocation() + FVector(0, 0, 150.f), CRCol(40, 36, 32), 30, 500.f, 1.6f, 26.f);
	}
	else
	{
		bFalling = true;
		FallV = 0.f;
	}
	if (GM)
	{
		GM->PlaySfx(ECRSfx::Boom, 1.f);
		GM->OnVehicleKilled(this);
	}
}

bool ACRVehicle::HasLOS(ACRGameMode* GM, ACRCharacter* P, const FVector& From) const
{
	const FVector To = P->Camera->GetComponentLocation();
	if (GM->IsSmokeBlocking(From, To)) return false;
	FHitResult Hit;
	FCollisionQueryParams Q(SCENE_QUERY_STAT(VehSight), true, this);
	for (ACREnemy* E : GM->Enemies) if (E) Q.AddIgnoredActor(E);
	for (ACRVehicle* V : GM->Vehicles) if (V) Q.AddIgnoredActor(V);
	return !GetWorld()->LineTraceSingleByChannel(Hit, From, To, ECC_Visibility, Q);
}

void ACRVehicle::Shoot(ACRGameMode* GM, ACRCharacter* P, float ChanceBase, float Dist, float DistDiv, float DmgMin, float DmgMax)
{
	if (Muzzle) Muzzle->SetVisibility(true);
	MuzzleT = 0.06f;
	GM->PlaySfx(ECRSfx::Enemy, 0.6f);
	const float Chance = FMath::Max(0.06f, ChanceBase - Dist / DistDiv);
	if (FMath::FRand() < Chance)
		UGameplayStatics::ApplyDamage(P, FMath::FRandRange(DmgMin, DmgMax), nullptr, this, UDamageType::StaticClass());
}

void ACRVehicle::Tick(float Dt)
{
	Super::Tick(Dt);
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	if (!GM || !GM->World) return;
	if (MuzzleT > 0.f)
	{
		MuzzleT -= Dt;
		if (MuzzleT <= 0.f && Muzzle) Muzzle->SetVisibility(false);
	}
	if (GM->IsFrozen()) return;
	if (!bAlive)
	{
		if (bFalling) TickFall(Dt, GM);
		return;
	}
	ACRCharacter* P = GM->PlayerChar;
	if (!P || P->bDead) return;
	switch (Type)
	{
	case EType::APC: TickAPC(Dt, GM, P); break;
	case EType::Heli: TickHeli(Dt, GM, P); break;
	case EType::Jet: TickJet(Dt, GM, P); break;
	}
}

void ACRVehicle::TickAPC(float Dt, ACRGameMode* GM, ACRCharacter* P)
{
	const FVector Loc = GetActorLocation();
	FVector To = P->GetActorLocation() - Loc;
	To.Z = 0.f;
	const float Dist = To.Size() / 100.f;
	const float TargetYaw = To.Rotation().Yaw;
	float Yaw = GetActorRotation().Yaw;
	float WantYaw = TargetYaw;
	float Speed = Dist > 30.f ? 450.f : 0.f;
	if (AvoidT > 0.f)
	{
		AvoidT -= Dt;
		WantYaw = Yaw + AvoidDir * 70.f;
		Speed = 300.f;
	}
	Yaw = FMath::FixedTurn(Yaw, WantYaw, 40.f * Dt);
	const FVector Fwd = FRotator(0.f, Yaw, 0.f).Vector();
	FVector Next = Loc + Fwd * Speed * Dt;
	if (Speed > 0.f && GM->World->Blocked(Next.X / 100.f + Fwd.X * 4.f, Next.Y / 100.f + Fwd.Y * 4.f, 3.f))
	{
		if (AvoidT <= 0.f) { AvoidT = 1.4f; AvoidDir = FMath::RandBool() ? 1.f : -1.f; }
		Next = Loc;
	}
	const float Hf = GM->World->H(Next.X / 100.f + Fwd.X * 3.f, Next.Y / 100.f + Fwd.Y * 3.f);
	const float Hb = GM->World->H(Next.X / 100.f - Fwd.X * 3.f, Next.Y / 100.f - Fwd.Y * 3.f);
	const float Pitch = FMath::RadiansToDegrees(FMath::Atan2((Hf - Hb), 6.f));
	SetActorLocationAndRotation(FVector(Next.X, Next.Y, GM->World->H(Next.X / 100.f, Next.Y / 100.f) * 100.f + 110.f), FRotator(Pitch, Yaw, 0.f));
	if (Turret) Turret->SetWorldRotation(FRotator(0.f, TargetYaw, 0.f));
	// shooting
	const FVector From = Turret ? Turret->GetComponentLocation() + FVector(0, 0, 40.f) : Loc;
	const bool bSee = Dist < 75.f && HasLOS(GM, P, From);
	Cd -= Dt;
	if (BurstLeft > 0)
	{
		BurstT -= Dt;
		if (BurstT <= 0.f) { BurstT = 0.1f; --BurstLeft; if (bSee) Shoot(GM, P, 0.4f, Dist, 150.f, 5.f, 8.f); }
	}
	else if (bSee && Cd <= 0.f)
	{
		BurstLeft = 8;
		Cd = FMath::FRandRange(2.5f, 4.f);
	}
}

void ACRVehicle::TickHeli(float Dt, ACRGameMode* GM, ACRCharacter* P)
{
	const FVector PL = P->GetActorLocation();
	Angle += Dt * 0.18f;
	const FVector Target = PL + FVector(FMath::Cos(Angle) * Orbit, FMath::Sin(Angle) * Orbit, AltCm + FMath::Sin(Angle * 3.f) * 300.f);
	const FVector Loc = GetActorLocation();
	const FVector New = FMath::VInterpTo(Loc, Target, Dt, 1.0f);
	FVector Face = PL - New;
	Face.Z = 0.f;
	const FVector Vel = (New - Loc) / FMath::Max(Dt, 0.001f);
	const float Tilt = FMath::Clamp(Vel.Size2D() / 1800.f * 12.f, 0.f, 14.f);
	SetActorLocationAndRotation(New, FRotator(-Tilt, Face.Rotation().Yaw, 0.f));
	if (Rotor) Rotor->AddLocalRotation(FRotator(0.f, 1300.f * Dt, 0.f));
	if (TailRotor) TailRotor->AddLocalRotation(FRotator(1600.f * Dt, 0.f, 0.f));
	const float Dist = FVector::Dist(New, PL) / 100.f;
	const FVector From = New + GetActorForwardVector() * 260.f - FVector(0, 0, 70.f);
	const bool bSee = Dist < 90.f && HasLOS(GM, P, From);
	Cd -= Dt;
	if (BurstLeft > 0)
	{
		BurstT -= Dt;
		if (BurstT <= 0.f) { BurstT = 0.09f; --BurstLeft; if (bSee) Shoot(GM, P, 0.25f, Dist, 400.f, 5.f, 8.f); }
	}
	else if (bSee && Cd <= 0.f)
	{
		BurstLeft = 12;
		Cd = FMath::FRandRange(3.f, 5.f);
	}
}

void ACRVehicle::TickJet(float Dt, ACRGameMode* GM, ACRCharacter* P)
{
	if (JetState == 0)
	{
		SetActorHiddenInGame(true);
		Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		for (UPrimitiveComponent* C : Parts) if (C) C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		JetWait -= Dt;
		if (JetWait > 0.f) return;
		// start of the strike: flies straight to the spot where the player is standing
		const FVector PL = P->GetActorLocation();
		JetTarget = PL;
		const float A = FMath::FRand() * 2.f * PI;
		JetDir = FVector(-FMath::Cos(A), -FMath::Sin(A), 0.f);
		const FVector Start = PL - JetDir * 60000.f + FVector(0, 0, 5500.f);
		SetActorLocationAndRotation(Start, JetDir.Rotation());
		SetActorHiddenInGame(false);
		Body->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
		for (UPrimitiveComponent* C : Parts) if (C) FCRShapes::HitPart(C);
		bBombed = false;
		JetState = 1;
		GM->Say(TEXT("JET STRIKE! Run!"), 3.5f);
		return;
	}
	const FVector Loc = GetActorLocation();
	const FVector New = Loc + JetDir * JetSpeed * Dt;
	SetActorLocation(New);
	const float Along = FVector::DotProduct(New - JetTarget, JetDir);
	if (!bBombed && Along > -300.f)
	{
		bBombed = true;
		FVector G = JetTarget;
		G.Z = GM->World->H(G.X / 100.f, G.Y / 100.f) * 100.f;
		GM->Explode(G, 10.f, 95.f);
	}
	if (Along > 60000.f)
	{
		JetState = 0;
		JetWait = FMath::FRandRange(14.f, 22.f);
	}
}

void ACRVehicle::TickFall(float Dt, ACRGameMode* GM)
{
	FallV += 1100.f * Dt;
	const FVector Loc = GetActorLocation() - FVector(0, 0, FallV * Dt);
	const float G = GM->World->H(Loc.X / 100.f, Loc.Y / 100.f) * 100.f + 130.f;
	SetActorLocationAndRotation(FVector(Loc.X, Loc.Y, FMath::Max(Loc.Z, G)), GetActorRotation() + FRotator(0.f, 220.f * Dt, 40.f * Dt));
	if (Loc.Z <= G)
	{
		bFalling = false;
		ACRParticles::Burst(GetWorld(), GetActorLocation(), CRCol(255, 160, 50), 26, 800.f, 1.0f, 22.f, 600000.f, 4000.f);
		ACRParticles::Burst(GetWorld(), GetActorLocation() + FVector(0, 0, 100.f), CRCol(36, 32, 30), 30, 500.f, 1.8f, 28.f);
		GM->Explode(GetActorLocation(), 6.f, 70.f);
	}
}
