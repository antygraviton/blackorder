#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "CRTypes.h"
#include "CRFx.generated.h"

class UInstancedStaticMeshComponent;
class UPointLightComponent;
class UProjectileMovementComponent;
class USphereComponent;

/** Simple particles (blood, dust, explosions) made of small cubes, no assets needed. */
UCLASS()
class ACRParticles : public AActor
{
	GENERATED_BODY()
public:
	ACRParticles();
	/** Position in centimeters. LightIntensity > 0 adds a light flash (explosion). */
	static void Burst(UWorld* W, const FVector& LocCm, const FLinearColor& Col, int32 N, float SpeedCm, float Life, float SizeCm, float LightIntensity = 0.f, float LightRadiusCm = 0.f);
	virtual void Tick(float DeltaSeconds) override;

protected:
	struct FP { FVector Pos; FVector Vel; };
	TArray<FP> Ps;
	UPROPERTY() UInstancedStaticMeshComponent* ISM = nullptr;
	UPROPERTY() UPointLightComponent* Light = nullptr;
	float Age = 0.f;
	float MaxLife = 1.f;
	float Size = 6.f;
	float LightPeak = 0.f;
};

/** Empty actor for small props (mine, medkit). */
UCLASS()
class ACRPropActor : public AActor
{
	GENERATED_BODY()
public:
	ACRPropActor();
};

/** Thrown grenade (M67, dynamite, smoke, flashbang). */
UCLASS()
class ACRGrenade : public AActor
{
	GENERATED_BODY()
public:
	ACRGrenade();
	void Setup(ECRKind InKind, float Fuse, float InRadius, float InDamage);
	void Throw(const FVector& VelCm);
protected:
	UPROPERTY() UProjectileMovementComponent* Move = nullptr;
	UPROPERTY() USphereComponent* Coll = nullptr;
	ECRKind Kind = ECRKind::Frag;
	float Radius = 7.f;
	float Damage = 130.f;
	void Boom();
};

/** Rocket from the RPG or a napalm canister. */
UCLASS()
class ACRRocket : public AActor
{
	GENERATED_BODY()
public:
	ACRRocket();
	void Launch(const FVector& VelCm, bool bInNapalm, float InRadius, float InDamage, AActor* Shooter);
	UFUNCTION() void OnStop(const FHitResult& Hit);
protected:
	UPROPERTY() UProjectileMovementComponent* Move = nullptr;
	UPROPERTY() USphereComponent* Coll = nullptr;
	bool bNapalm = false;
	bool bDone = false;
	float Radius = 8.f;
	float Damage = 220.f;
};

/** Arrow from the bow or crossbow: flies in an arc, hits are detected with a line trace between positions. */
UCLASS()
class ACRArrow : public AActor
{
	GENERATED_BODY()
public:
	ACRArrow();
	void Launch(const FVector& VelCm, float InDamage, AActor* InShooter, AController* InInst);
	virtual void Tick(float DeltaSeconds) override;
protected:
	FVector Vel = FVector::ZeroVector;
	float Dmg = 80.f;
	bool bStuck = false;
	UPROPERTY() AActor* Shooter = nullptr;
	UPROPERTY() AController* Inst = nullptr;
};

/** Napalm fire: damages over time. */
UCLASS()
class ACRFireZone : public AActor
{
	GENERATED_BODY()
public:
	ACRFireZone();
	void Init(float InRadiusCm, float InDur, float InDps);
	virtual void Tick(float DeltaSeconds) override;
protected:
	UPROPERTY() UInstancedStaticMeshComponent* ISMA = nullptr;
	UPROPERTY() UInstancedStaticMeshComponent* ISMB = nullptr;
	UPROPERTY() UPointLightComponent* Light = nullptr;
	float RadiusCm = 350.f;
	float Dur = 6.f;
	float Dps = 14.f;
	float Age = 0.f;
	float DmgT = 0.f;
	float AnimT = 0.f;
	TArray<FVector> Base;
};

/** Smoke screen (visual; the GameMode owns the line-of-sight logic). */
UCLASS()
class ACRSmokeCloud : public AActor
{
	GENERATED_BODY()
public:
	ACRSmokeCloud();
	void Init(float InRadiusCm, float InDur);
	virtual void Tick(float DeltaSeconds) override;
protected:
	UPROPERTY() UInstancedStaticMeshComponent* ISM = nullptr;
	float RadiusCm = 800.f;
	float Dur = 12.f;
	float Age = 0.f;
	TArray<FVector> Base;
};
