#pragma once
#include "CoreMinimal.h"

class AActor;
class USceneComponent;
class UPrimitiveComponent;

/** Positions of important weapon points in centimeters (in parent space). X is forward. */
struct FCRGunInfo
{
	FVector Muzzle = FVector::ZeroVector;
	FVector RH = FVector::ZeroVector;
	FVector LH = FVector::ZeroVector;
	bool bHasMuzzle = false;
	bool bHasLH = false;
	float SightZ = 6.f;
};

/** Builds the weapon model from boxes and cylinders. bDetail=false for enemy weapons. */
FCRGunInfo CRBuildGun(AActor* Owner, USceneComponent* Parent, FName Id, bool bDetail, TArray<UPrimitiveComponent*>* Out);

/** Gloved hands with sleeves (for the first-person view). */
void CRAddHands(AActor* Owner, USceneComponent* Parent, const FCRGunInfo& Info, bool bHasRH, TArray<UPrimitiveComponent*>* Out);
