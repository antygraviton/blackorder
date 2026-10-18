#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "CRTypes.h"
#include "CREnemy.generated.h"

class UPrimitiveComponent;
class UStaticMeshComponent;

/** Black Order soldier: body built from boxes and cylinders, simple AI (looks for the player, approaches, strafes and shoots). */
UCLASS()
class CERNYRAD_API ACREnemy : public ACharacter
{
	GENERATED_BODY()
public:
	ACREnemy();
	void Setup(float InHp, float InAcc);
	void Alert() { bAlerted = true; }
	void Stun(float Secs) { StunT = FMath::Max(StunT, Secs); }

	float Health = 60.f;
	float Accuracy = 0.5f;
	bool bAlive = true;
	bool bAlerted = false;

	virtual float TakeDamage(float Damage, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser) override;

protected:
	virtual void Tick(float DeltaSeconds) override;
	void BuildBody();
	void Die();
	USceneComponent* Pivot(const FVector& Loc);
	UPrimitiveComponent* Part(UPrimitiveComponent* C, bool bHead);
	void Arm(const FVector& Shoulder, const FVector& Hand, const FVector& Pole, const FLinearColor& Col);

	TArray<UPrimitiveComponent*> Parts;
	USceneComponent* HipL = nullptr;
	USceneComponent* HipR = nullptr;
	USceneComponent* KneeL = nullptr;
	USceneComponent* KneeR = nullptr;
	UStaticMeshComponent* Muzzle = nullptr;
	int32 Kind = 0;
	float Cd = 1.5f;
	float StrafeDir = 1.f;
	float StrafeT = 0.f;
	float WalkT = 0.f;
	float IdleT = 0.f;
	float FlinchT = 0.f;
	float MuzzleT = 0.f;
	float DeathT = 0.f;
	float StunT = 0.f;
	float BaseYaw = 0.f;
};
