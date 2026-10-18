#pragma once
#include "CoreMinimal.h"

class AActor;
class UStaticMesh;
class UStaticMeshComponent;
class UInstancedStaticMeshComponent;
class USceneComponent;
class UMaterialInterface;
class UPrimitiveComponent;

/** Color from sRGB values 0-255. */
FLinearColor CRCol(int32 R, int32 G, int32 B, float A = 1.f);

/**
 * Shapes from the engine built-in meshes (cube, cylinder, sphere, cone), colored through a dynamic material.
 * All dimensions are in CENTIMETERS. Later they can be replaced with custom models and materials.
 */
struct FCRShapes
{
	static UStaticMesh* CubeMesh();
	static UStaticMesh* CylMesh();
	static UStaticMesh* SphereMesh();
	static UStaticMesh* ConeMesh();
	static UMaterialInterface* Mat(const FLinearColor& C);

	static UStaticMeshComponent* Box(AActor* Owner, USceneComponent* Parent, const FVector& SizeCm, const FVector& LocCm, const FLinearColor& Col, const FRotator& Rot = FRotator::ZeroRotator, FName Profile = NAME_None);
	/** Cylinder: the axis is Z. For a cylinder along X use Rot = FRotator(90,0,0). */
	static UStaticMeshComponent* Cyl(AActor* Owner, USceneComponent* Parent, float RadiusCm, float HeightCm, const FVector& LocCm, const FLinearColor& Col, const FRotator& Rot = FRotator::ZeroRotator, FName Profile = NAME_None);
	static UStaticMeshComponent* Ball(AActor* Owner, USceneComponent* Parent, const FVector& RadiiCm, const FVector& LocCm, const FLinearColor& Col, FName Profile = NAME_None);
	/** Cylinder between two points (for limbs). */
	static UStaticMeshComponent* Limb(AActor* Owner, USceneComponent* Parent, const FVector& A, const FVector& B, float R1, float R2, const FLinearColor& Col, FName Profile = NAME_None);
	static UInstancedStaticMeshComponent* Inst(AActor* Owner, UStaticMesh* Mesh, const FLinearColor& Col, bool bCollide, bool bShadow);
	static void SetProfile(UPrimitiveComponent* C, FName Profile);
	/** Enemy body part: reacts only to shots (Visibility channel). */
	static void HitPart(UPrimitiveComponent* C);
};

enum class ECRSfx : uint8 { Rifle, Heavy, Pistol, Enemy, Reload, Hit, Kill, Boom, Hurt, Beep, Kit, Knife };

namespace CRAudio
{
	/** Sound generated in code (no files). */
	void Play(UObject* Ctx, ECRSfx Kind, float Vol, float Master);
}
