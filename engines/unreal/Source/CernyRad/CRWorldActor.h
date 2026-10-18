#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "CRTypes.h"
#include "CRWorldActor.generated.h"

class UProceduralMeshComponent;
class UInstancedStaticMeshComponent;

/**
 * Generates the whole game environment: hilly terrain with mountains, fences instead of walls, houses, ruins,
 * props and vegetation. All units in function parameters are METERS (except component positions).
 */
UCLASS()
class ACRWorldActor : public AActor
{
	GENERATED_BODY()
public:
	ACRWorldActor();
	void Build(int32 LevelIdx);

	/** Terrain height in meters (X, Y are meters). */
	float H(float X, float Y) const;
	bool Blocked(float X, float Y, float Margin) const;
	FVector2D FreeSpot(bool bSeeded, float MinFromStart, float Margin, float Half = 70.f);

	struct FMapRect { FBox2D Box; FLinearColor Color; };
	TArray<FMapRect> MapRects;

protected:
	TArray<FBox2D> Blockers;
	FRandomStream Rng;
	FCRLevelDef Lvl;
	float Seed = 1.f;
	int32 LevelIndex = 0;
	UPROPERTY() UProceduralMeshComponent* Terrain = nullptr;

	float Noise(float X, float Y, float Freq) const;
	void BuildTerrain();
	void BuildFences();
	void Fence(FVector2D A, FVector2D B, int32 Type);
	void BuildHouses();
	void House(float X, float Y, float W, float D);
	void Hangar(float X, float Y, float W, float D);
	void Runway();
	void Ruin(float X, float Y);
	void BuildProps();
	void Car(float X, float Y);
	void BuildVegetation();
	void AddBlocker(float X, float Y, float W, float D);
	FVector Loc(float X, float Y, float Z) const { return FVector(X * 100.f, Y * 100.f, Z * 100.f); }
	FLinearColor Jit(const FLinearColor& C, float A);
	void SolidBox(const FVector& SizeM, const FVector& CenterM, const FLinearColor& Col, bool bCollide, const FRotator& Rot = FRotator::ZeroRotator);
};
