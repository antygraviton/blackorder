#include "CRFx.h"
#include "CRUtil.h"
#include "CRGameMode.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "GameFramework/DamageType.h"
#include "GameFramework/ProjectileMovementComponent.h"
#include "Kismet/GameplayStatics.h"
#include "TimerManager.h"

// ---------------- particles ----------------
ACRParticles::ACRParticles()
{
	PrimaryActorTick.bCanEverTick = true;
	USceneComponent* R = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	SetRootComponent(R);
}

void ACRParticles::Burst(UWorld* W, const FVector& LocCm, const FLinearColor& Col, int32 N, float SpeedCm, float Life, float SizeCm, float LightIntensity, float LightRadiusCm)
{
	if (!W) return;
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	ACRParticles* A = W->SpawnActor<ACRParticles>(ACRParticles::StaticClass(), FTransform::Identity, P);
	if (!A) return;
	A->MaxLife = Life;
	A->Size = SizeCm;
	A->ISM = FCRShapes::Inst(A, FCRShapes::CubeMesh(), Col, false, false);
	for (int32 i = 0; i < N; ++i)
	{
		FP Pt;
		Pt.Pos = LocCm;
		Pt.Vel = FMath::VRand() * SpeedCm * FMath::FRandRange(0.3f, 1.f);
		Pt.Vel.Z = FMath::Abs(Pt.Vel.Z) + SpeedCm * 0.3f;
		A->Ps.Add(Pt);
		A->ISM->AddInstance(FTransform(FRotator::ZeroRotator, LocCm, FVector(SizeCm / 100.f)));
	}
	if (LightIntensity > 0.f)
	{
		A->Light = NewObject<UPointLightComponent>(A);
		A->Light->SetupAttachment(A->GetRootComponent());
		A->Light->SetRelativeLocation(LocCm);
		A->Light->SetIntensity(LightIntensity);
		A->Light->SetAttenuationRadius(LightRadiusCm);
		A->Light->SetLightColor(FLinearColor(1.f, 0.65f, 0.3f));
		A->Light->SetCastShadows(false);
		A->Light->RegisterComponent();
		A->LightPeak = LightIntensity;
	}
	A->SetLifeSpan(Life + 0.2f);
}

void ACRParticles::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	Age += DeltaSeconds;
	if (!ISM) return;
	const float K = FMath::Clamp(1.f - Age / MaxLife, 0.05f, 1.f);
	for (int32 i = 0; i < Ps.Num(); ++i)
	{
		FP& P = Ps[i];
		P.Vel.Z -= 900.f * DeltaSeconds;
		P.Pos += P.Vel * DeltaSeconds;
		ISM->UpdateInstanceTransform(i, FTransform(FRotator::ZeroRotator, P.Pos, FVector(Size / 100.f * K)), true, false, true);
	}
	ISM->MarkRenderStateDirty();
	if (Light) Light->SetIntensity(LightPeak * FMath::Clamp(1.f - Age / 0.35f, 0.f, 1.f));
}

ACRPropActor::ACRPropActor()
{
	PrimaryActorTick.bCanEverTick = false;
	SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("Root")));
}

// ---------------- grenades ----------------
ACRGrenade::ACRGrenade()
{
	PrimaryActorTick.bCanEverTick = false;
	Coll = CreateDefaultSubobject<USphereComponent>(TEXT("Coll"));
	Coll->InitSphereRadius(6.f);
	Coll->SetCollisionProfileName(TEXT("BlockAll"));
	Coll->SetCollisionResponseToChannel(ECC_Pawn, ECR_Ignore);
	Coll->SetCollisionResponseToChannel(ECC_Visibility, ECR_Ignore);
	SetRootComponent(Coll);
	Move = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("Move"));
	Move->bShouldBounce = true;
	Move->Bounciness = 0.35f;
	Move->Friction = 0.5f;
	Move->ProjectileGravityScale = 1.f;
	Move->bAutoActivate = false;
	Move->UpdatedComponent = Coll;
}

void ACRGrenade::Setup(ECRKind InKind, float Fuse, float InRadius, float InDamage)
{
	Kind = InKind;
	Radius = InRadius;
	Damage = InDamage;
	switch (Kind)
	{
	case ECRKind::Dynamite:
		for (int32 i = 0; i < 3; ++i) FCRShapes::Cyl(this, Coll, 2.2f, 20.f, FVector(0.f, (i - 1) * 4.5f, 0.f), CRCol(190, 40, 30));
		break;
	case ECRKind::Smoke:
		FCRShapes::Cyl(this, Coll, 3.2f, 14.f, FVector::ZeroVector, CRCol(120, 124, 120));
		break;
	case ECRKind::Flash:
		FCRShapes::Cyl(this, Coll, 3.f, 14.f, FVector::ZeroVector, CRCol(40, 44, 50));
		break;
	default:
		FCRShapes::Ball(this, Coll, FVector(5.f, 5.f, 5.f), FVector::ZeroVector, CRCol(72, 84, 46));
		break;
	}
	FTimerHandle H;
	GetWorldTimerManager().SetTimer(H, this, &ACRGrenade::Boom, Fuse, false);
}

void ACRGrenade::Throw(const FVector& VelCm)
{
	Move->Velocity = VelCm;
	Move->Activate();
}

void ACRGrenade::Boom()
{
	if (ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>())
	{
		switch (Kind)
		{
		case ECRKind::Smoke: GM->AddSmoke(GetActorLocation(), Radius, 12.f); break;
		case ECRKind::Flash: GM->Flash(GetActorLocation(), Radius, 4.f); break;
		default: GM->Explode(GetActorLocation(), Radius, Damage); break;
		}
	}
	Destroy();
}

// ---------------- rocket / napalm ----------------
ACRRocket::ACRRocket()
{
	PrimaryActorTick.bCanEverTick = false;
	Coll = CreateDefaultSubobject<USphereComponent>(TEXT("Coll"));
	Coll->InitSphereRadius(8.f);
	Coll->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	Coll->SetCollisionResponseToChannel(ECC_Visibility, ECR_Ignore);
	SetRootComponent(Coll);
	Move = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("Move"));
	Move->bRotationFollowsVelocity = true;
	Move->bShouldBounce = false;
	Move->bAutoActivate = false;
	Move->UpdatedComponent = Coll;
}

void ACRRocket::Launch(const FVector& VelCm, bool bInNapalm, float InRadius, float InDamage, AActor* Shooter)
{
	bNapalm = bInNapalm;
	Radius = InRadius;
	Damage = InDamage;
	if (bNapalm)
	{
		FCRShapes::Ball(this, Coll, FVector(9.f, 9.f, 9.f), FVector::ZeroVector, CRCol(230, 110, 30));
		Move->ProjectileGravityScale = 0.6f;
	}
	else
	{
		FCRShapes::Cyl(this, Coll, 4.f, 70.f, FVector::ZeroVector, CRCol(60, 70, 50), FRotator(90.f, 0.f, 0.f));
		FCRShapes::Ball(this, Coll, FVector(5.f, 5.f, 5.f), FVector(35.f, 0.f, 0.f), CRCol(120, 40, 30));
		Move->ProjectileGravityScale = 0.05f;
	}
	if (Shooter) Coll->IgnoreActorWhenMoving(Shooter, true);
	Move->OnProjectileStop.AddDynamic(this, &ACRRocket::OnStop);
	Move->Velocity = VelCm;
	Move->Activate();
	SetLifeSpan(8.f);
}

void ACRRocket::OnStop(const FHitResult& Hit)
{
	if (bDone) return;
	bDone = true;
	if (ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>())
	{
		if (bNapalm) GM->SpawnFire(GetActorLocation(), Damage);
		else GM->Explode(GetActorLocation(), Radius, Damage);
	}
	Destroy();
}

// ---------------- arrows ----------------
ACRArrow::ACRArrow()
{
	PrimaryActorTick.bCanEverTick = true;
	SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("Root")));
}

void ACRArrow::Launch(const FVector& VelCm, float InDamage, AActor* InShooter, AController* InInst)
{
	Vel = VelCm;
	Dmg = InDamage;
	Shooter = InShooter;
	Inst = InInst;
	FCRShapes::Cyl(this, nullptr, 0.7f, 70.f, FVector::ZeroVector, CRCol(120, 90, 56), FRotator(90.f, 0.f, 0.f));
	FCRShapes::Box(this, nullptr, FVector(6.f, 3.f, 3.f), FVector(36.f, 0.f, 0.f), CRCol(150, 154, 160));
	SetActorRotation(Vel.Rotation());
	SetLifeSpan(10.f);
}

void ACRArrow::Tick(float Dt)
{
	Super::Tick(Dt);
	if (bStuck) return;
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	if (GM && GM->State == ACRGameMode::EState::Paused) return;
	Vel.Z -= 600.f * Dt;
	const FVector From = GetActorLocation();
	const FVector To = From + Vel * Dt;
	FHitResult Hit;
	FCollisionQueryParams Q(SCENE_QUERY_STAT(ArrowTrace), true, this);
	if (Shooter) Q.AddIgnoredActor(Shooter);
	if (GetWorld()->LineTraceSingleByChannel(Hit, From, To, ECC_Visibility, Q))
	{
		if (AActor* A = Hit.GetActor())
			UGameplayStatics::ApplyPointDamage(A, Dmg, Vel.GetSafeNormal(), Hit, Inst, Shooter, UDamageType::StaticClass());
		SetActorLocation(Hit.ImpactPoint);
		bStuck = true;
		SetLifeSpan(6.f);
		return;
	}
	SetActorLocation(To);
	SetActorRotation(Vel.Rotation());
}

// ---------------- fire ----------------
ACRFireZone::ACRFireZone()
{
	PrimaryActorTick.bCanEverTick = true;
	SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("Root")));
}

void ACRFireZone::Init(float InRadiusCm, float InDur, float InDps)
{
	RadiusCm = InRadiusCm;
	Dur = InDur;
	Dps = InDps;
	ISMA = FCRShapes::Inst(this, FCRShapes::CubeMesh(), CRCol(255, 120, 20), false, false);
	ISMB = FCRShapes::Inst(this, FCRShapes::CubeMesh(), CRCol(255, 214, 80), false, false);
	for (int32 i = 0; i < 22; ++i)
	{
		const float A = FMath::FRand() * 2.f * PI;
		const float R = FMath::Sqrt(FMath::FRand()) * RadiusCm * 0.85f;
		Base.Add(FVector(FMath::Cos(A) * R, FMath::Sin(A) * R, 0.f));
		(i % 2 == 0 ? ISMA : ISMB)->AddInstance(FTransform(GetActorLocation() + Base.Last()));
	}
	Light = NewObject<UPointLightComponent>(this);
	Light->SetupAttachment(GetRootComponent());
	Light->SetIntensity(20000.f);
	Light->SetAttenuationRadius(1200.f);
	Light->SetLightColor(FLinearColor(1.f, 0.5f, 0.15f));
	Light->SetCastShadows(false);
	Light->SetRelativeLocation(FVector(0.f, 0.f, 120.f));
	Light->RegisterComponent();
	SetLifeSpan(Dur + 0.2f);
}

void ACRFireZone::Tick(float Dt)
{
	Super::Tick(Dt);
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	if (!GM || GM->State == ACRGameMode::EState::Paused) return;
	Age += Dt;
	DmgT += Dt;
	AnimT += Dt;
	if (DmgT >= 0.25f)
	{
		DmgT = 0.f;
		GM->FireDamage(GetActorLocation(), RadiusCm / 100.f, Dps * 0.25f);
	}
	if (AnimT > 0.07f && ISMA && ISMB)
	{
		AnimT = 0.f;
		const float K = FMath::Clamp((Dur - Age) / 1.5f, 0.f, 1.f);
		for (int32 i = 0; i < Base.Num(); ++i)
		{
			const float H = (40.f + FMath::FRand() * 90.f) * K;
			const FTransform T(FRotator(0, FMath::FRand() * 90.f, 0), GetActorLocation() + Base[i] + FVector(0, 0, H * 0.5f), FVector(0.35f, 0.35f, H / 100.f));
			(i % 2 == 0 ? ISMA : ISMB)->UpdateInstanceTransform(i / 2, T, true, false, true);
		}
		ISMA->MarkRenderStateDirty();
		ISMB->MarkRenderStateDirty();
		if (Light) Light->SetIntensity(20000.f * FMath::FRandRange(0.7f, 1.2f) * K);
	}
}

// ---------------- smoke ----------------
ACRSmokeCloud::ACRSmokeCloud()
{
	PrimaryActorTick.bCanEverTick = true;
	SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("Root")));
}

void ACRSmokeCloud::Init(float InRadiusCm, float InDur)
{
	RadiusCm = InRadiusCm;
	Dur = InDur;
	ISM = FCRShapes::Inst(this, FCRShapes::SphereMesh(), CRCol(150, 154, 150), false, false);
	for (int32 i = 0; i < 16; ++i)
	{
		const float A = FMath::FRand() * 2.f * PI;
		const float R = FMath::Sqrt(FMath::FRand()) * RadiusCm * 0.7f;
		Base.Add(FVector(FMath::Cos(A) * R, FMath::Sin(A) * R, FMath::FRand() * 300.f));
		ISM->AddInstance(FTransform(FRotator::ZeroRotator, GetActorLocation() + Base.Last(), FVector(0.1f)));
	}
	SetLifeSpan(Dur);
}

void ACRSmokeCloud::Tick(float Dt)
{
	Super::Tick(Dt);
	ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>();
	if (!GM || GM->State == ACRGameMode::EState::Paused || !ISM) return;
	Age += Dt;
	const float Grow = FMath::Clamp(Age / 1.5f, 0.f, 1.f);
	const float Fade = FMath::Clamp((Dur - Age) / 2.f, 0.f, 1.f);
	const float S = RadiusCm * 0.45f / 100.f * Grow * Fade;
	for (int32 i = 0; i < Base.Num(); ++i)
		ISM->UpdateInstanceTransform(i, FTransform(FRotator::ZeroRotator, GetActorLocation() + Base[i] + FVector(0, 0, Age * 15.f), FVector(S * 2.f)), true, false, true);
	ISM->MarkRenderStateDirty();
}
