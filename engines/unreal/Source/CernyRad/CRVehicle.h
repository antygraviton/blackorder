#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "CRVehicle.generated.h"

class UBoxComponent;
class UPrimitiveComponent;
class UStaticMeshComponent;
class ACRCharacter;
class ACRGameMode;

/**
 * Enemy vehicles: armored personnel carrier, helicopter, jet.
 * They resist rifle bullets (armor); full damage comes from explosions (RPG, grenade, dynamite); napalm and the bow only partly.
 */
UCLASS()
class CERNYRAD_API ACRVehicle : public AActor
{
	GENERATED_BODY()
public:
	enum class EType : uint8 { APC, Heli, Jet };

	ACRVehicle();
	void Setup(EType T, float Hp);

	EType Type = EType::APC;
	float Health = 500.f;
	float MaxHealth = 500.f;
	bool bAlive = true;
	bool CountsForMission() const { return Type != EType::Jet; }

	virtual float TakeDamage(float Damage, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser) override;
	virtual void Tick(float DeltaSeconds) override;

protected:
	UPROPERTY() UBoxComponent* Body = nullptr;
	TArray<UPrimitiveComponent*> Parts;
	USceneComponent* Turret = nullptr;
	USceneComponent* Rotor = nullptr;
	USceneComponent* TailRotor = nullptr;
	UStaticMeshComponent* Muzzle = nullptr;
	float PointMul = 0.06f;

	// shared state
	float Cd = 2.f;
	float BurstT = 0.f;
	int32 BurstLeft = 0;
	float MuzzleT = 0.f;
	// APC
	float AvoidT = 0.f;
	float AvoidDir = 1.f;
	// helicopter
	float Angle = 0.f;
	float Orbit = 4000.f;
	float AltCm = 2800.f;
	// jet
	int32 JetState = 0;
	float JetWait = 6.f;
	FVector JetDir = FVector::ForwardVector;
	FVector JetTarget = FVector::ZeroVector;
	float JetSpeed = 9000.f;
	bool bBombed = false;
	// falling
	bool bFalling = false;
	float FallV = 0.f;

	UPrimitiveComponent* Part(UPrimitiveComponent* C);
	USceneComponent* Pivot(USceneComponent* Parent, const FVector& Loc);
	void BuildAPC();
	void BuildHeli();
	void BuildJet();
	void Die();
	void TickAPC(float Dt, ACRGameMode* GM, ACRCharacter* P);
	void TickHeli(float Dt, ACRGameMode* GM, ACRCharacter* P);
	void TickJet(float Dt, ACRGameMode* GM, ACRCharacter* P);
	void TickFall(float Dt, ACRGameMode* GM);
	bool HasLOS(ACRGameMode* GM, ACRCharacter* P, const FVector& From) const;
	void Shoot(ACRGameMode* GM, ACRCharacter* P, float ChanceBase, float Dist, float DistDiv, float DmgMin, float DmgMax);
};
