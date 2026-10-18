#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "CRTypes.h"
#include "CRGun.h"
#include "CRCharacter.generated.h"

class UCameraComponent;
class UPointLightComponent;
class UStaticMeshComponent;

/** Player: movement, aiming, 4 weapon slots (primary, secondary, knife, grenade). The weapon model and hands are built in code. */
UCLASS()
class CERNYRAD_API ACRCharacter : public ACharacter
{
	GENERATED_BODY()
public:
	ACRCharacter();
	void InitFromProfile();

	UPROPERTY() UCameraComponent* Camera = nullptr;
	UPROPERTY() USceneComponent* ViewRoot = nullptr;
	UPROPERTY() UPointLightComponent* FlashLight = nullptr;

	float Health = 100.f;
	bool bDead = false;
	bool bAiming = false;
	TArray<FName> SlotIds;
	int32 CurSlot = 0;
	struct FAmmo { int32 Mag = 0; int32 Res = 0; };
	TMap<FName, FAmmo> Ammo;
	int32 Nades = 3;
	float ReloadT = 0.f;
	float ReloadMax = 1.6f;

	const FCRWeaponDef* CurDef() const;
	bool IsScoped() const;
	void EquipSlot(int32 Index);
	void Fire(bool bFirst);
	void StartReload();
	void Heal(float V);
	void Hurt(float V);
	virtual float TakeDamage(float Damage, FDamageEvent const& DamageEvent, AController* EventInstigator, AActor* DamageCauser) override;

protected:
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* Input) override;

	void MoveForward(float V);
	void MoveRight(float V);
	void Turn(float V);
	void LookUp(float V);
	void SprintOn() { bSprint = true; }
	void SprintOff() { bSprint = false; }
	void AimOn() { bAiming = true; }
	void AimOff() { bAiming = false; }
	void FireOn() { bFireHeld = true; Fire(true); }
	void FireOff() { bFireHeld = false; }
	void ReloadPressed() { StartReload(); }
	void Slot1() { EquipSlot(0); }
	void Slot2() { EquipSlot(1); }
	void Slot3() { EquipSlot(2); }
	void Slot4() { EquipSlot(3); }
	void Slot5() { EquipSlot(4); }
	void BuildView();

	TArray<UPrimitiveComponent*> ViewComps;
	UStaticMeshComponent* MuzzleBall = nullptr;
	FCRGunInfo GunInfo;
	FVector ViewBase = FVector(28.f, 16.f, -19.f);
	bool bSprint = false;
	bool bFireHeld = false;
	bool bMoving = false;
	double LastShot = -10.0;
	float KickAmt = 0.f;
	float BobT = 0.f;
	float FlashT = 0.f;
	float Sens = 1.f;
	float BaseFOV = 80.f;
};
