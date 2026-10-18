#include "CRUtil.h"
#include "Components/StaticMeshComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/PrimitiveComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/EngineTypes.h"
#include "GameFramework/Actor.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "Sound/SoundWaveProcedural.h"
#include "Kismet/GameplayStatics.h"

FLinearColor CRCol(int32 R, int32 G, int32 B, float A)
{
	FLinearColor C = FLinearColor::FromSRGBColor(FColor((uint8)FMath::Clamp(R, 0, 255), (uint8)FMath::Clamp(G, 0, 255), (uint8)FMath::Clamp(B, 0, 255)));
	C.A = A;
	return C;
}

static UStaticMesh* LoadShape(const TCHAR* Path)
{
	return LoadObject<UStaticMesh>(nullptr, Path);
}

UStaticMesh* FCRShapes::CubeMesh() { static UStaticMesh* M = nullptr; if (!M) { M = LoadShape(TEXT("/Engine/BasicShapes/Cube.Cube")); if (M) M->AddToRoot(); } return M; }
UStaticMesh* FCRShapes::CylMesh() { static UStaticMesh* M = nullptr; if (!M) { M = LoadShape(TEXT("/Engine/BasicShapes/Cylinder.Cylinder")); if (M) M->AddToRoot(); } return M; }
UStaticMesh* FCRShapes::SphereMesh() { static UStaticMesh* M = nullptr; if (!M) { M = LoadShape(TEXT("/Engine/BasicShapes/Sphere.Sphere")); if (M) M->AddToRoot(); } return M; }
UStaticMesh* FCRShapes::ConeMesh() { static UStaticMesh* M = nullptr; if (!M) { M = LoadShape(TEXT("/Engine/BasicShapes/Cone.Cone")); if (M) M->AddToRoot(); } return M; }

UMaterialInterface* FCRShapes::Mat(const FLinearColor& C)
{
	static TMap<uint32, UMaterialInstanceDynamic*> Cache;
	static UMaterialInterface* Base = nullptr;
	if (!Base)
	{
		Base = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
		if (Base) Base->AddToRoot();
	}
	if (!Base) return nullptr;
	const uint32 Key = C.ToFColor(true).DWColor();
	if (UMaterialInstanceDynamic** F = Cache.Find(Key))
		return *F;
	UMaterialInstanceDynamic* M = UMaterialInstanceDynamic::Create(Base, GetTransientPackage());
	M->SetVectorParameterValue(TEXT("Color"), C);
	M->SetVectorParameterValue(TEXT("BaseColor"), C);
	M->AddToRoot();
	Cache.Add(Key, M);
	return M;
}

void FCRShapes::SetProfile(UPrimitiveComponent* C, FName Profile)
{
	if (!C) return;
	if (Profile == NAME_None) Profile = TEXT("NoCollision");
	C->SetCollisionProfileName(Profile);
}

void FCRShapes::HitPart(UPrimitiveComponent* C)
{
	if (!C) return;
	C->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	C->SetCollisionResponseToAllChannels(ECR_Ignore);
	C->SetCollisionResponseToChannel(ECC_Visibility, ECR_Block);
}

static UStaticMeshComponent* MakeComp(AActor* Owner, USceneComponent* Parent, UStaticMesh* Mesh, const FLinearColor& Col, const FVector& Scale, const FVector& Loc, const FRotator& Rot, FName Profile)
{
	UStaticMeshComponent* C = NewObject<UStaticMeshComponent>(Owner);
	C->SetStaticMesh(Mesh);
	if (UMaterialInterface* M = FCRShapes::Mat(Col)) C->SetMaterial(0, M);
	C->SetupAttachment(Parent ? Parent : Owner->GetRootComponent());
	C->SetRelativeLocation(Loc);
	C->SetRelativeRotation(Rot);
	C->SetRelativeScale3D(Scale);
	C->RegisterComponent();
	FCRShapes::SetProfile(C, Profile);
	return C;
}

UStaticMeshComponent* FCRShapes::Box(AActor* Owner, USceneComponent* Parent, const FVector& SizeCm, const FVector& LocCm, const FLinearColor& Col, const FRotator& Rot, FName Profile)
{
	return MakeComp(Owner, Parent, CubeMesh(), Col, SizeCm / 100.f, LocCm, Rot, Profile);
}

UStaticMeshComponent* FCRShapes::Cyl(AActor* Owner, USceneComponent* Parent, float RadiusCm, float HeightCm, const FVector& LocCm, const FLinearColor& Col, const FRotator& Rot, FName Profile)
{
	return MakeComp(Owner, Parent, CylMesh(), Col, FVector(RadiusCm * 2.f / 100.f, RadiusCm * 2.f / 100.f, HeightCm / 100.f), LocCm, Rot, Profile);
}

UStaticMeshComponent* FCRShapes::Ball(AActor* Owner, USceneComponent* Parent, const FVector& RadiiCm, const FVector& LocCm, const FLinearColor& Col, FName Profile)
{
	return MakeComp(Owner, Parent, SphereMesh(), Col, RadiiCm * 2.f / 100.f, LocCm, FRotator::ZeroRotator, Profile);
}

UStaticMeshComponent* FCRShapes::Limb(AActor* Owner, USceneComponent* Parent, const FVector& A, const FVector& B, float R1, float R2, const FLinearColor& Col, FName Profile)
{
	const FVector D = B - A;
	const float Len = D.Size();
	if (Len < 0.01f) return nullptr;
	const FRotator Rot = FRotationMatrix::MakeFromZ(D.GetSafeNormal()).Rotator();
	return MakeComp(Owner, Parent, CylMesh(), Col, FVector((R1 + R2) / 100.f, (R1 + R2) / 100.f, Len / 100.f), (A + B) * 0.5f, Rot, Profile);
}

UInstancedStaticMeshComponent* FCRShapes::Inst(AActor* Owner, UStaticMesh* Mesh, const FLinearColor& Col, bool bCollide, bool bShadow)
{
	UInstancedStaticMeshComponent* C = NewObject<UInstancedStaticMeshComponent>(Owner);
	C->SetStaticMesh(Mesh);
	if (UMaterialInterface* M = Mat(Col)) C->SetMaterial(0, M);
	C->SetupAttachment(Owner->GetRootComponent());
	C->SetCastShadow(bShadow);
	C->RegisterComponent();
	SetProfile(C, bCollide ? FName(TEXT("BlockAll")) : FName(TEXT("NoCollision")));
	return C;
}

namespace CRAudio
{
	void Play(UObject* Ctx, ECRSfx Kind, float Vol, float Master)
	{
		if (Master <= 0.f || !Ctx) return;
		float Freq = 400.f, Dur = 0.05f, Noise = 0.f, Decay = 1.f;
		switch (Kind)
		{
		case ECRSfx::Rifle: Freq = 150.f; Dur = 0.13f; Noise = 0.7f; Decay = 3.f; break;
		case ECRSfx::Heavy: Freq = 80.f; Dur = 0.3f; Noise = 0.6f; Decay = 2.5f; break;
		case ECRSfx::Pistol: Freq = 230.f; Dur = 0.1f; Noise = 0.6f; Decay = 3.f; break;
		case ECRSfx::Enemy: Freq = 120.f; Dur = 0.1f; Noise = 0.7f; Decay = 3.f; break;
		case ECRSfx::Reload: Freq = 500.f; Dur = 0.06f; Noise = 0.2f; Decay = 2.f; break;
		case ECRSfx::Hit: Freq = 900.f; Dur = 0.04f; Noise = 0.1f; Decay = 2.f; break;
		case ECRSfx::Kill: Freq = 300.f; Dur = 0.14f; Noise = 0.2f; Decay = 2.f; break;
		case ECRSfx::Boom: Freq = 45.f; Dur = 0.8f; Noise = 0.6f; Decay = 2.f; break;
		case ECRSfx::Hurt: Freq = 110.f; Dur = 0.18f; Noise = 0.5f; Decay = 2.f; break;
		case ECRSfx::Beep: Freq = 900.f; Dur = 0.05f; Noise = 0.f; Decay = 1.f; break;
		case ECRSfx::Kit: Freq = 600.f; Dur = 0.15f; Noise = 0.f; Decay = 1.5f; break;
		case ECRSfx::Knife: Freq = 500.f; Dur = 0.09f; Noise = 0.5f; Decay = 2.f; break;
		}
		const int32 N = FMath::RoundToInt(44100.f * Dur);
		TArray<uint8> Data;
		Data.SetNumUninitialized(N * 2);
		FRandomStream R((int32)(Freq * 7.f));
		for (int32 i = 0; i < N; ++i)
		{
			const float T = (float)i / 44100.f;
			const float Env = FMath::Pow(1.f - (float)i / (float)N, Decay);
			const float Tone = FMath::Sin(2.f * PI * Freq * T) >= 0.f ? 0.5f : -0.5f;
			const float V = (Tone * (1.f - Noise) + R.FRandRange(-1.f, 1.f) * Noise) * Env;
			const int16 S = (int16)FMath::Clamp(V * 30000.f, -32767.f, 32767.f);
			Data[i * 2] = (uint8)(S & 0xFF);
			Data[i * 2 + 1] = (uint8)((S >> 8) & 0xFF);
		}
		USoundWaveProcedural* W = NewObject<USoundWaveProcedural>();
		W->SetSampleRate(44100);
		W->NumChannels = 1;
		W->Duration = Dur;
		W->SoundGroup = SOUNDGROUP_Default;
		W->bLooping = false;
		W->QueueAudio(Data.GetData(), Data.Num());
		UGameplayStatics::PlaySound2D(Ctx, W, Vol * Master);
	}
}
