#include "CREnemy.h"
#include "CRUtil.h"
#include "CRFx.h"
#include "CRGun.h"
#include "CRCharacter.h"
#include "CRGameMode.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DamageEvents.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/DamageType.h"
#include "AIController.h"
#include "Kismet/GameplayStatics.h"

// body coordinates: meters from the feet, X forward, Y right, Z up. The capsule is centered at a height of 90 cm.
static FVector E(float X, float Y, float Z) { return FVector(X * 100.f, Y * 100.f, Z * 100.f - 90.f); }

ACREnemy::ACREnemy()
{
	PrimaryActorTick.bCanEverTick = true;
	AIControllerClass = AAIController::StaticClass();
	AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
	GetCapsuleComponent()->InitCapsuleSize(38.f, 90.f);
	GetCapsuleComponent()->SetCollisionResponseToChannel(ECC_Visibility, ECR_Ignore);
	GetCharacterMovement()->MaxWalkSpeed = 260.f;
	GetCharacterMovement()->bRunPhysicsWithNoController = true;
	GetCharacterMovement()->bOrientRotationToMovement = false;
	bUseControllerRotationYaw = false;
	if (GetMesh()) GetMesh()->SetVisibility(false);
}

USceneComponent* ACREnemy::Pivot(const FVector& Loc)
{
	USceneComponent* P = NewObject<USceneComponent>(this);
	P->SetupAttachment(GetCapsuleComponent());
	P->SetRelativeLocation(Loc);
	P->RegisterComponent();
	return P;
}

UPrimitiveComponent* ACREnemy::Part(UPrimitiveComponent* C, bool bHead)
{
	if (!C) return nullptr;
	FCRShapes::HitPart(C);
	if (bHead) C->ComponentTags.Add(TEXT("Head"));
	Parts.Add(C);
	return C;
}

void ACREnemy::Setup(float InHp, float InAcc)
{
	Health = InHp;
	Accuracy = InAcc;
	Kind = FMath::RandRange(0, 3);
	Cd = FMath::FRandRange(1.f, 3.f);
	StrafeDir = FMath::RandBool() ? 1.f : -1.f;
	BaseYaw = FMath::FRandRange(0.f, 360.f);
	SetActorRotation(FRotator(0.f, BaseYaw, 0.f));
	BuildBody();
}

void ACREnemy::Arm(const FVector& Sp, const FVector& HandIn, const FVector& Pole, const FLinearColor& Col)
{
	const float A = 27.f, B = 26.f;
	FVector Hand = HandIn;
	FVector D = Hand - Sp;
	float Ln = D.Size();
	const float Mx = A + B - 1.f;
	if (Ln > Mx) { Hand = Sp + D.GetSafeNormal() * Mx; Ln = Mx; D = Hand - Sp; }
	const FVector Dir = D.GetSafeNormal();
	const float X = (A * A - B * B + Ln * Ln) / (2.f * Ln);
	const float Hh = FMath::Sqrt(FMath::Max(0.f, A * A - X * X));
	const FVector P = (Pole - Dir * FVector::DotProduct(Pole, Dir)).GetSafeNormal();
	const FVector El = Sp + Dir * X + P * Hh;
	Part(FCRShapes::Limb(this, GetCapsuleComponent(), Sp, El, 5.f, 4.3f, Col), false);
	Part(FCRShapes::Limb(this, GetCapsuleComponent(), El, Hand, 4.3f, 3.6f, Col), false);
	Part(FCRShapes::Box(this, GetCapsuleComponent(), FVector(10.f, 8.5f, 7.5f), Hand, CRCol(23, 23, 26)), false);
}

void ACREnemy::BuildBody()
{
	USceneComponent* Root = GetCapsuleComponent();
	const FLinearColor Camos[3] = { CRCol(66, 76, 46), CRCol(78, 90, 60), CRCol(150, 130, 94) };
	const FLinearColor Camo = Camos[(Kind + FMath::RandRange(0, 1)) % 3];
	const FLinearColor Vests[3] = { CRCol(84, 74, 52), CRCol(54, 58, 44), CRCol(26, 26, 28) };
	const FLinearColor Vest = Vests[FMath::RandRange(0, 2)];
	const FLinearColor Black = CRCol(18, 18, 20);
	const FLinearColor Boot = CRCol(30, 25, 20);
	const FLinearColor Skin = Kind == 2 ? CRCol(20, 20, 22) : CRCol(186, 138, 104);
	const FLinearColor Helm = Kind == 0 ? CRCol(70, 80, 56) : CRCol(28, 28, 30);

	// legs
	for (int32 Side = -1; Side <= 1; Side += 2)
	{
		USceneComponent* Hip = Pivot(E(0.f, Side * 0.1f, 0.92f));
		USceneComponent* Knee = NewObject<USceneComponent>(this);
		Knee->SetupAttachment(Hip);
		Knee->SetRelativeLocation(FVector(0.f, 0.f, -46.f));
		Knee->RegisterComponent();
		Part(FCRShapes::Limb(this, Hip, FVector(0, 0, 0), FVector(0, 0, -46), 8.5f, 7.f, Camo), false);
		Part(FCRShapes::Limb(this, Knee, FVector(0, 0, 0), FVector(0, 0, -42), 7.f, 5.2f, Camo), false);
		Part(FCRShapes::Box(this, Knee, FVector(30.f, 11.f, 11.f), FVector(5.f, 0.f, -45.f), Boot), false);
		Part(FCRShapes::Box(this, Knee, FVector(5.f, 12.f, 12.f), FVector(7.f, 0.f, -2.f), Black), false);
		if (Side < 0) { HipL = Hip; KneeL = Knee; } else { HipR = Hip; KneeR = Knee; }
	}
	// torso
	Part(FCRShapes::Box(this, Root, FVector(22.f, 36.f, 20.f), E(0, 0, 1.0f), Camo), false);
	Part(FCRShapes::Box(this, Root, FVector(24.f, 38.f, 4.f), E(0, 0, 1.08f), Black), false);
	Part(FCRShapes::Box(this, Root, FVector(24.f, 40.f, 50.f), E(0, 0, 1.33f), Camo), false);
	Part(FCRShapes::Box(this, Root, FVector(8.f, 34.f, 38.f), E(0.15f, 0, 1.33f), Vest), false);
	for (int32 i = 0; i < 3; ++i)
		Part(FCRShapes::Box(this, Root, FVector(5.f, 8.f, 12.f), E(0.2f, -0.1f + i * 0.1f, 1.18f), Black), false);
	Part(FCRShapes::Box(this, Root, FVector(7.f, 34.f, 38.f), E(-0.14f, 0, 1.33f), Vest), false);
	if (Kind != 3) Part(FCRShapes::Box(this, Root, FVector(14.f, 30.f, 38.f), E(-0.22f, 0, 1.34f), Camo), false);
	for (int32 Side = -1; Side <= 1; Side += 2)
		Part(FCRShapes::Ball(this, Root, FVector(7.f, 7.f, 7.f), E(0, Side * 0.22f, 1.53f), Camo), false);
	Part(FCRShapes::Box(this, Root, FVector(30.f, 8.f, 12.f), E(0, 0.29f, 1.5f), CRCol(180, 30, 30)), false);
	Part(FCRShapes::Cyl(this, Root, 4.5f, 9.f, E(0, 0, 1.61f), Skin), false);

	// head
	const FVector Hc = E(0, 0, 1.72f);
	Part(FCRShapes::Ball(this, Root, FVector(9.2f, 7.8f, 10.5f), Hc, Skin), true);
	// eyes, eyebrows, mouth
	for (int32 Side = -1; Side <= 1; Side += 2)
	{
		Part(FCRShapes::Ball(this, Root, FVector(1.2f, 1.7f, 1.1f), Hc + FVector(8.6f, Side * 3.4f, 1.8f), CRCol(230, 226, 214)), true);
		Part(FCRShapes::Ball(this, Root, FVector(0.8f, 0.9f, 0.9f), Hc + FVector(9.4f, Side * 3.4f, 1.8f), CRCol(14, 10, 8)), true);
		Part(FCRShapes::Box(this, Root, FVector(1.f, 4.2f, 0.9f), Hc + FVector(8.6f, Side * 3.4f, 3.6f), CRCol(20, 14, 10)), true);
	}
	Part(FCRShapes::Box(this, Root, FVector(1.f, 4.5f, 0.9f), Hc + FVector(8.8f, 0.f, -4.2f), CRCol(110, 50, 44)), true);
	if (Kind == 0) Part(FCRShapes::Ball(this, Root, FVector(7.f, 6.8f, 5.f), Hc + FVector(4.2f, 0.f, -6.2f), CRCol(26, 20, 16)), true);
	if (Kind == 0 || Kind == 2)
	{
		Part(FCRShapes::Ball(this, Root, FVector(11.7f, 10.5f, 8.5f), Hc + FVector(-0.5f, 0.f, 3.f), Helm), true);
		for (int32 Side = -1; Side <= 1; Side += 2)
			Part(FCRShapes::Cyl(this, Root, 4.f, 3.f, Hc + FVector(0.f, Side * 9.f, -0.5f), Black, FRotator(0, 0, 90)), true);
		if (Kind == 0)
		{
			Part(FCRShapes::Box(this, Root, FVector(5.f, 5.f, 4.f), Hc + FVector(9.f, 0.f, 10.f), Black), true);
			for (int32 Side = -1; Side <= 1; Side += 2)
			{
				Part(FCRShapes::Cyl(this, Root, 2.5f, 9.f, Hc + FVector(14.f, Side * 3.2f, 11.5f), Black, FRotator(90, 0, 0)), true);
				Part(FCRShapes::Ball(this, Root, FVector(0.9f, 1.8f, 1.8f), Hc + FVector(18.8f, Side * 3.2f, 11.5f), CRCol(110, 255, 190)), true);
			}
			Part(FCRShapes::Box(this, Root, FVector(9.f, 1.f, 1.f), Hc + FVector(6.f, -8.f, -4.f), Black), true);
		}
		else
		{
			Part(FCRShapes::Box(this, Root, FVector(3.f, 14.f, 4.5f), Hc + FVector(10.3f, 0.f, 2.5f), CRCol(26, 46, 64)), true);
		}
	}
	else if (Kind == 1)
	{
		Part(FCRShapes::Cyl(this, Root, 9.f, 9.f, Hc + FVector(0.f, 0.f, 10.f), Camo), true);
		Part(FCRShapes::Cyl(this, Root, 20.f, 1.2f, Hc + FVector(0.f, 0.f, 6.2f), Camo), true);
	}
	else
	{
		Part(FCRShapes::Cyl(this, Root, 9.f, 7.f, Hc + FVector(0.f, 0.f, 10.f), Helm), true);
		Part(FCRShapes::Box(this, Root, FVector(8.f, 10.f, 1.f), Hc + FVector(-13.f, 0.f, 7.5f), Helm), true);
		Part(FCRShapes::Box(this, Root, FVector(1.f, 6.f, 3.6f), Hc + FVector(8.9f, -3.4f, 1.8f), CRCol(10, 10, 12)), true);
		Part(FCRShapes::Box(this, Root, FVector(1.f, 6.f, 3.6f), Hc + FVector(8.9f, 3.4f, 1.8f), CRCol(10, 10, 12)), true);
	}

	// weapon and arms
	const TCHAR* Guns[4] = { TEXT("hk416"), TEXT("hk416"), TEXT("ak"), TEXT("mp5") };
	USceneComponent* GunRoot = Pivot(E(0.04f, 0.03f, 1.42f));
	const FCRGunInfo GI = CRBuildGun(this, GunRoot, FName(Guns[FMath::RandRange(0, 3)]), false, &Parts);
	for (UPrimitiveComponent* P : Parts) { if (P) FCRShapes::HitPart(P); }
	const FVector G0 = GunRoot->GetRelativeLocation();
	Arm(E(0, 0.22f, 1.5f), G0 + GI.RH, FVector(-0.5f, 0.6f, -1.f), Camo);
	Arm(E(0, -0.22f, 1.5f), G0 + GI.LH, FVector(-0.2f, -0.6f, -1.f), Camo);
	Muzzle = FCRShapes::Ball(this, Root, FVector(8.f, 8.f, 8.f), G0 + GI.Muzzle, CRCol(255, 220, 120));
	if (Muzzle) { Muzzle->SetVisibility(false); Muzzle->SetCollisionEnabled(ECollisionEnabled::NoCollision); }
	for (UPrimitiveComponent* P : Parts) { if (P) P->SetCastShadow(true); }
}

float ACREnemy::TakeDamage(float Damage, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser)
{
	if (!bAlive) return 0.f;
	float Actual = Super::TakeDamage(Damage, DamageEvent, EventInstigator, DamageCauser);
	bool bHead = false;
	FVector At = GetActorLocation();
	if (DamageEvent.IsOfType(FPointDamageEvent::ClassID))
	{
		const FPointDamageEvent* P = static_cast<const FPointDamageEvent*>(&DamageEvent);
		At = P->HitInfo.ImpactPoint;
		if (P->HitInfo.Component.IsValid() && P->HitInfo.Component->ComponentHasTag(TEXT("Head")))
		{
			bHead = true;
			Actual *= 2.5f;
		}
	}
	Health -= Actual;
	bAlerted = true;
	FlinchT = 0.25f;
	ACRParticles::Burst(GetWorld(), At, CRCol(140, 8, 8), bHead ? 14 : 8, 380.f, 0.8f, 5.f);
	if (ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>())
	{
		GM->HitMarker();
		GM->PlaySfx(ECRSfx::Hit, 0.5f);
	}
	if (Health <= 0.f) Die();
	return Actual;
}

void ACREnemy::Die()
{
	bAlive = false;
	GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	for (UPrimitiveComponent* P : Parts) { if (P) P->SetCollisionEnabled(ECollisionEnabled::NoCollision); }
	GetCharacterMovement()->DisableMovement();
	if (ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>())
	{
		GM->PlaySfx(ECRSfx::Kill, 1.f);
		GM->OnEnemyKilled(this);
	}
}

void ACREnemy::Tick(float Dt)
{
	Super::Tick(Dt);
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	if (!GM) return;
	if (!bAlive)
	{
		if (DeathT < 1.f)
		{
			DeathT += Dt * 2.2f;
			const float Q = FMath::Min(1.f, DeathT);
			SetActorRotation(FRotator(Q * 85.f, GetActorRotation().Yaw, 0.f));
			if (HipL) HipL->SetRelativeRotation(FRotator(Q * 25.f, 0, 0));
			if (HipR) HipR->SetRelativeRotation(FRotator(-Q * 15.f, 0, 0));
			if (Q >= 1.f) SetActorLocation(GetActorLocation() - FVector(0, 0, 55.f));
		}
		return;
	}
	if (GM->IsFrozen()) return;
	ACRCharacter* P = GM->PlayerChar;
	if (!P || P->bDead) return;

	const FVector To = P->GetActorLocation() - GetActorLocation();
	const FVector Flat(To.X, To.Y, 0.f);
	const float Dist = Flat.Size() / 100.f;
	bool bSee = false;
	if (Dist < 60.f)
	{
		FHitResult Hit;
		FCollisionQueryParams Q(SCENE_QUERY_STAT(EnemySight), true, this);
		for (ACREnemy* O : GM->Enemies) if (O) Q.AddIgnoredActor(O);
		const FVector EyeFrom = GetActorLocation() + FVector(0, 0, 70);
		bSee = !GetWorld()->LineTraceSingleByChannel(Hit, EyeFrom, P->Camera->GetComponentLocation(), ECC_Visibility, Q)
			&& !GM->IsSmokeBlocking(EyeFrom, P->Camera->GetComponentLocation());
	}
	if (bSee) bAlerted = true;
	bool bWalking = false;

	if (FlinchT > 0.f) FlinchT -= Dt;
	if (StunT > 0.f)
	{
		StunT -= Dt; // stunned: does not move or shoot
		bSee = false;
		bAlerted = true;
		if (MuzzleT > 0.f) { MuzzleT -= Dt; if (MuzzleT <= 0.f && Muzzle) Muzzle->SetVisibility(false); }
		return;
	}

	if (bAlerted)
	{
		const FVector F = Dist > 0.01f ? Flat.GetSafeNormal() : FVector::ForwardVector;
		const FRotator Target(0.f, F.Rotation().Yaw, 0.f);
		SetActorRotation(FMath::RInterpTo(GetActorRotation(), Target, Dt, 8.f));
		FVector Mv = FVector::ZeroVector;
		if (Dist > 16.f) Mv = F;
		else if (Dist < 8.f) Mv = -F;
		else
		{
			StrafeT -= Dt;
			if (StrafeT <= 0.f) { StrafeDir *= -1.f; StrafeT = FMath::FRandRange(1.f, 3.f); }
			Mv = FVector(-F.Y, F.X, 0.f) * StrafeDir * 0.6f;
		}
		bWalking = !Mv.IsNearlyZero();
		if (bWalking) AddMovementInput(Mv, 1.f);
		Cd -= Dt;
		if (bSee && Cd <= 0.f)
		{
			Cd = FMath::FRandRange(0.9f, 2.f);
			if (Muzzle) Muzzle->SetVisibility(true);
			MuzzleT = 0.07f;
			GM->PlaySfx(ECRSfx::Enemy, 0.5f);
			const float Chance = FMath::Max(0.12f, Accuracy - Dist / 70.f);
			if (FMath::FRand() < Chance)
				UGameplayStatics::ApplyDamage(P, FMath::FRandRange(7.f, 12.f), nullptr, this, UDamageType::StaticClass());
		}
	}
	else
	{
		IdleT += Dt * 0.4f;
		AddActorWorldRotation(FRotator(0.f, FMath::Sin(IdleT) * Dt * 30.f, 0.f));
	}
	if (MuzzleT > 0.f)
	{
		MuzzleT -= Dt;
		if (MuzzleT <= 0.f && Muzzle) Muzzle->SetVisibility(false);
	}
	if (HipL && HipR && KneeL && KneeR)
	{
		if (bWalking)
		{
			WalkT += Dt * 8.f;
			const float S = FMath::Sin(WalkT);
			HipL->SetRelativeRotation(FRotator(S * 40.f, 0, 0));
			HipR->SetRelativeRotation(FRotator(-S * 40.f, 0, 0));
			KneeL->SetRelativeRotation(FRotator(-FMath::Max(0.f, -S) * 50.f, 0, 0));
			KneeR->SetRelativeRotation(FRotator(-FMath::Max(0.f, S) * 50.f, 0, 0));
		}
		else
		{
			HipL->SetRelativeRotation(FMath::RInterpTo(HipL->GetRelativeRotation(), FRotator::ZeroRotator, Dt, 8.f));
			HipR->SetRelativeRotation(FMath::RInterpTo(HipR->GetRelativeRotation(), FRotator::ZeroRotator, Dt, 8.f));
			KneeL->SetRelativeRotation(FMath::RInterpTo(KneeL->GetRelativeRotation(), FRotator::ZeroRotator, Dt, 8.f));
			KneeR->SetRelativeRotation(FMath::RInterpTo(KneeR->GetRelativeRotation(), FRotator::ZeroRotator, Dt, 8.f));
		}
	}
}
