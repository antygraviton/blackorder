#include "CRWorldActor.h"
#include "CRUtil.h"
#include "ProceduralMeshComponent.h"
#include "Components/BoxComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"

ACRWorldActor::ACRWorldActor()
{
	PrimaryActorTick.bCanEverTick = false;
	USceneComponent* R = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	SetRootComponent(R);
}

float ACRWorldActor::Noise(float X, float Y, float Freq) const
{
	return FMath::PerlinNoise2D(FVector2D(X * Freq + Seed * 7.3f, Y * Freq + Seed * 3.1f));
}

float ACRWorldActor::H(float X, float Y) const
{
	const float R = FMath::Max(FMath::Abs(X), FMath::Abs(Y));
	float h = Noise(X, Y, 0.018f) * 2.4f * (Lvl.bDesert ? 0.6f : 1.f);
	if (R < 90.f)
		h *= 0.25f + 0.75f * FMath::SmoothStep(3.f, 11.f, FMath::Abs(X));
	const float Rd = 1.f - FMath::Abs(Noise(X + 31.f, Y + 17.f, 0.011f)) * 1.4f;
	h += FMath::SmoothStep(84.f, 150.f, R) * (20.f + FMath::Max(0.f, Rd) * 85.f) + FMath::SmoothStep(150.f, 240.f, R) * 60.f;
	return h;
}

bool ACRWorldActor::Blocked(float X, float Y, float Margin) const
{
	const FVector2D P(X, Y);
	for (const FBox2D& B : Blockers)
	{
		if (P.X > B.Min.X - Margin && P.X < B.Max.X + Margin && P.Y > B.Min.Y - Margin && P.Y < B.Max.Y + Margin)
			return true;
	}
	return false;
}

FVector2D ACRWorldActor::FreeSpot(bool bSeeded, float MinFromStart, float Margin, float Half)
{
	for (int32 i = 0; i < 300; ++i)
	{
		const float X = (bSeeded ? Rng.FRand() : FMath::FRand()) * 2.f * Half - Half;
		const float Y = (bSeeded ? Rng.FRand() : FMath::FRand()) * 2.f * Half - Half;
		if (FVector2D(X, Y - 70.f).Size() < MinFromStart) continue;
		if (Blocked(X, Y, Margin)) continue;
		return FVector2D(X, Y);
	}
	return FVector2D(0.f, -40.f);
}

void ACRWorldActor::AddBlocker(float X, float Y, float W, float D)
{
	Blockers.Add(FBox2D(FVector2D(X - W / 2.f, Y - D / 2.f), FVector2D(X + W / 2.f, Y + D / 2.f)));
}

FLinearColor ACRWorldActor::Jit(const FLinearColor& C, float A)
{
	const float V = Rng.FRandRange(-A, A);
	return FLinearColor(FMath::Clamp(C.R + V, 0.f, 1.f), FMath::Clamp(C.G + V, 0.f, 1.f), FMath::Clamp(C.B + V, 0.f, 1.f), 1.f);
}

void ACRWorldActor::SolidBox(const FVector& SizeM, const FVector& CenterM, const FLinearColor& Col, bool bCollide, const FRotator& Rot)
{
	FCRShapes::Box(this, nullptr, SizeM * 100.f, CenterM * 100.f, Col, Rot, bCollide ? FName(TEXT("BlockAll")) : NAME_None);
}

void ACRWorldActor::Build(int32 LevelIdx)
{
	LevelIndex = LevelIdx;
	Lvl = CRData::Levels()[LevelIdx];
	Seed = (float)Lvl.Seed;
	Rng.Initialize(Lvl.Seed * 101);
	BuildTerrain();
	BuildFences();
	if (Lvl.bRunway) Runway();
	BuildHouses();
	BuildProps();
	BuildVegetation();
}

// ---------------- terrain ----------------
void ACRWorldActor::BuildTerrain()
{
	const int32 N = 130;
	const float Size = 480.f;
	struct FSec
	{
		TArray<FVector> V; TArray<FVector> Nrm; TArray<int32> T; TArray<FVector2D> UV; TArray<FColor> C; TArray<FProcMeshTangent> Tan;
	};
	FSec Sec[4]; // 0 grass, 1 dirt, 2 rock, 3 road
	const FLinearColor Cols[4] = { Lvl.Grass, Lvl.Dirt, Lvl.Rock, Lvl.Road };

	auto Pt = [&](int32 i, int32 j) { return FVector2D(((float)i / N - 0.5f) * Size, ((float)j / N - 0.5f) * Size); };
	auto Nr = [&](float x, float y)
	{
		const float hx = H(x + 2.f, y) - H(x - 2.f, y);
		const float hy = H(x, y + 2.f) - H(x, y - 2.f);
		return FVector(-hx / 4.f, -hy / 4.f, 1.f).GetSafeNormal();
	};

	for (int32 j = 0; j < N; ++j)
	{
		for (int32 i = 0; i < N; ++i)
		{
			const FVector2D P[4] = { Pt(i, j), Pt(i + 1, j), Pt(i, j + 1), Pt(i + 1, j + 1) };
			const float cx = (P[0].X + P[3].X) * 0.5f;
			const float cy = (P[0].Y + P[3].Y) * 0.5f;
			const float hc = H(cx, cy);
			const FVector Nc = Nr(cx, cy);
			const float Slope = FMath::Sqrt(FMath::Max(0.f, 1.f - Nc.Z * Nc.Z)) / FMath::Max(0.05f, Nc.Z);
			const float R = FMath::Max(FMath::Abs(cx), FMath::Abs(cy));
			int32 K = 0;
			if (Slope > 0.55f || hc > 28.f) K = 2;
			else if (R < 88.f && FMath::Abs(cx) < 4.5f) K = 3;
			else if (Noise(cx, cy, 0.06f) > 0.12f) K = 1;
			FSec& S = Sec[K];
			const int32 Base = S.V.Num();
			for (int32 c = 0; c < 4; ++c)
			{
				S.V.Add(FVector(P[c].X * 100.f, P[c].Y * 100.f, H(P[c].X, P[c].Y) * 100.f));
				S.Nrm.Add(Nr(P[c].X, P[c].Y));
				S.UV.Add(FVector2D(P[c].X, P[c].Y) / 5.5f);
				S.C.Add(FColor::White);
				S.Tan.Add(FProcMeshTangent(1.f, 0.f, 0.f));
			}
			// both winding directions so the terrain is visible from above regardless of orientation
			const int32 Tri[12] = { 0, 1, 2, 1, 3, 2, 0, 2, 1, 1, 2, 3 };
			for (int32 t = 0; t < 12; ++t) S.T.Add(Base + Tri[t]);
		}
	}
	Terrain = NewObject<UProceduralMeshComponent>(this);
	Terrain->bUseAsyncCooking = false;
	Terrain->SetupAttachment(GetRootComponent());
	Terrain->RegisterComponent();
	for (int32 k = 0; k < 4; ++k)
	{
		if (Sec[k].V.Num() == 0) continue;
		Terrain->CreateMeshSection(k, Sec[k].V, Sec[k].T, Sec[k].Nrm, Sec[k].UV, Sec[k].C, Sec[k].Tan, true);
		if (UMaterialInterface* M = FCRShapes::Mat(Cols[k])) Terrain->SetMaterial(k, M);
	}
	Terrain->SetCollisionProfileName(TEXT("BlockAll"));
}

// ---------------- fences instead of walls ----------------
namespace
{
	struct FFenceSet
	{
		UInstancedStaticMeshComponent* PostW = nullptr;
		UInstancedStaticMeshComponent* PostM = nullptr;
		UInstancedStaticMeshComponent* Rail = nullptr;
		UInstancedStaticMeshComponent* Picket = nullptr;
		UInstancedStaticMeshComponent* Wire = nullptr;
		UInstancedStaticMeshComponent* VWire = nullptr;
	};
	FFenceSet GFence;
}

void ACRWorldActor::BuildFences()
{
	UStaticMesh* Cube = FCRShapes::CubeMesh();
	GFence.PostW = FCRShapes::Inst(this, Cube, CRCol(110, 78, 50), false, true);
	GFence.PostM = FCRShapes::Inst(this, Cube, CRCol(90, 92, 95), false, true);
	GFence.Rail = FCRShapes::Inst(this, Cube, CRCol(120, 86, 56), false, false);
	GFence.Picket = FCRShapes::Inst(this, Cube, CRCol(134, 98, 64), false, false);
	GFence.Wire = FCRShapes::Inst(this, Cube, CRCol(70, 70, 72), false, false);
	GFence.VWire = FCRShapes::Inst(this, Cube, CRCol(120, 122, 124), false, false);
	const float B = 78.f;
	Fence(FVector2D(-B, B), FVector2D(B, B), 0);
	Fence(FVector2D(-B, -B), FVector2D(B, -B), 0);
	Fence(FVector2D(-B, -B), FVector2D(-B, B), 1);
	Fence(FVector2D(B, -B), FVector2D(B, B), 2);
}

void ACRWorldActor::Fence(FVector2D A, FVector2D B, int32 Type)
{
	const float Len = FVector2D::Distance(A, B);
	const FVector2D Dir = (B - A) / Len;
	const float YawDeg = FMath::RadiansToDegrees(FMath::Atan2(Dir.Y, Dir.X));
	const FRotator Rot(0.f, YawDeg, 0.f);
	const int32 N = FMath::RoundToInt(Len / 3.f);
	const float Span = Len / N;
	// invisible wall: blocks only the player and enemies, bullets and view pass through
	const FVector2D Mid = (A + B) * 0.5f;
	UBoxComponent* Box = NewObject<UBoxComponent>(this);
	Box->SetupAttachment(GetRootComponent());
	Box->SetBoxExtent(FVector(FMath::Max(0.5f, FMath::Abs(Dir.X) * Len) * 50.f, FMath::Max(0.5f, FMath::Abs(Dir.Y) * Len) * 50.f, 150.f));
	Box->SetRelativeLocation(Loc(Mid.X, Mid.Y, 1.5f + H(Mid.X, Mid.Y)));
	Box->RegisterComponent();
	Box->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
	Box->SetCollisionResponseToAllChannels(ECR_Ignore);
	Box->SetCollisionResponseToChannel(ECC_Pawn, ECR_Block);
	Box->SetCollisionResponseToChannel(ECC_WorldStatic, ECR_Block);
	Blockers.Add(FBox2D(FVector2D(Mid.X - FMath::Max(0.5f, FMath::Abs(Dir.X) * Len) / 2.f, Mid.Y - FMath::Max(0.5f, FMath::Abs(Dir.Y) * Len) / 2.f),
		FVector2D(Mid.X + FMath::Max(0.5f, FMath::Abs(Dir.X) * Len) / 2.f, Mid.Y + FMath::Max(0.5f, FMath::Abs(Dir.Y) * Len) / 2.f)));

	auto Tr = [&](float X, float Y, float Z, const FVector& Scale) { return FTransform(Rot, Loc(X, Y, Z), Scale); };
	for (int32 i = 0; i <= N; ++i)
	{
		const FVector2D P = A + Dir * Span * i;
		const float G = H(P.X, P.Y);
		if (Type == 0) GFence.PostW->AddInstance(FTransform(FRotator::ZeroRotator, Loc(P.X, P.Y, G + 0.95f), FVector(0.15f, 0.15f, 1.9f)));
		else GFence.PostM->AddInstance(FTransform(FRotator::ZeroRotator, Loc(P.X, P.Y, G + 1.1f), FVector(0.07f, 0.07f, 2.2f)));
	}
	for (int32 i = 0; i < N; ++i)
	{
		const FVector2D C = A + Dir * Span * (i + 0.5f);
		const float G = H(C.X, C.Y);
		if (Type == 0)
		{
			GFence.Rail->AddInstance(Tr(C.X, C.Y, G + 0.45f, FVector(3.05f, 0.05f, 0.08f)));
			GFence.Rail->AddInstance(Tr(C.X, C.Y, G + 1.15f, FVector(3.05f, 0.05f, 0.08f)));
			for (int32 k = -6; k < 6; ++k)
			{
				if (Rng.FRand() < 0.07f) continue;
				const float Off = (k + 0.5f) * 0.25f;
				const FVector2D Q = C + Dir * Off;
				GFence.Picket->AddInstance(Tr(Q.X, Q.Y, H(Q.X, Q.Y) + 0.72f + Rng.FRandRange(-0.04f, 0.04f), FVector(0.1f, 0.025f, 1.4f * Rng.FRandRange(0.9f, 1.1f))));
			}
		}
		else if (Type == 1)
		{
			GFence.Rail->AddInstance(Tr(C.X, C.Y, G + 1.88f, FVector(3.05f, 0.04f, 0.05f)));
			for (int32 s = 0; s < 3; ++s) GFence.Wire->AddInstance(Tr(C.X, C.Y, G + 2.0f + s * 0.1f, FVector(3.05f, 0.012f, 0.012f)));
			for (int32 s = 0; s < 6; ++s) GFence.Wire->AddInstance(Tr(C.X, C.Y, G + 0.2f + s * 0.3f, FVector(3.05f, 0.01f, 0.01f)));
			for (int32 k = -5; k <= 5; ++k)
			{
				const FVector2D Q = C + Dir * (k * 0.28f);
				GFence.VWire->AddInstance(Tr(Q.X, Q.Y, H(Q.X, Q.Y) + 0.95f, FVector(0.01f, 0.01f, 1.8f)));
			}
		}
		else
		{
			for (int32 s = 0; s < 5; ++s) GFence.Wire->AddInstance(Tr(C.X, C.Y, G + 0.35f + s * 0.36f, FVector(3.05f, 0.012f, 0.012f)));
		}
	}
}

// ---------------- houses ----------------
void ACRWorldActor::BuildHouses()
{
	struct FFp { float X, Y, W, D; };
	TArray<FFp> Fp;
	int32 Placed = 0, Tries = 0;
	while (Placed < Lvl.Houses && Tries < 600)
	{
		++Tries;
		const float W = (Lvl.bDesert ? 12.f : 8.f) + (float)(Rng.RandRange(0, Lvl.bDesert ? 6 : 4));
		const float D = (Lvl.bDesert ? 9.f : 7.f) + (float)(Rng.RandRange(0, 3));
		const float X = (Rng.FRand() - 0.5f) * 136.f;
		const float Y = (Rng.FRand() - 0.5f) * 120.f;
		if (FMath::Abs(X) < W / 2.f + 7.f || FVector2D(X, Y - 70.f).Size() < 24.f) continue;
		bool bOk = true;
		for (const FFp& F : Fp)
		{
			if (FMath::Abs(F.X - X) < (F.W + W) / 2.f + 6.f && FMath::Abs(F.Y - Y) < (F.D + D) / 2.f + 6.f) { bOk = false; break; }
		}
		if (!bOk) continue;
		Fp.Add({ X, Y, W, D });
		if (Lvl.bDesert) Hangar(X, Y, W, D); else House(X, Y, W, D);
		++Placed;
	}
	for (int32 i = 0; i < Lvl.Ruins; ++i)
	{
		const FVector2D P = FreeSpot(true, 24.f, 10.f, 64.f);
		Ruin(P.X, P.Y);
	}
}

void ACRWorldActor::House(float X, float Y, float W, float D)
{
	const float H1 = H(X - W / 2.f, Y - D / 2.f), H2 = H(X + W / 2.f, Y - D / 2.f), H3 = H(X - W / 2.f, Y + D / 2.f), H4 = H(X + W / 2.f, Y + D / 2.f);
	const float Lo = FMath::Min(FMath::Min(H1, H2), FMath::Min(H3, H4));
	const float Hi = FMath::Max(FMath::Max(H1, H2), FMath::Max(H3, H4));
	const float Hgt = 3.1f + Rng.FRand() * 0.6f;
	const float Fl = Hi + 0.1f;
	const FLinearColor Plaster = CRCol(214, 203, 178);
	const FLinearColor Roof = CRCol(128, 52, 36);
	const FLinearColor Conc = CRCol(120, 120, 114);
	const FLinearColor Dark = CRCol(14, 20, 24);
	const FLinearColor White = CRCol(232, 226, 210);
	// foundation and walls
	SolidBox(FVector(W + 0.2f, D + 0.2f, Fl - Lo + 0.6f), FVector(X, Y, Lo - 0.3f + (Fl - Lo + 0.6f) / 2.f), Conc, true);
	SolidBox(FVector(W, D, Hgt), FVector(X, Y, Fl + Hgt / 2.f), Plaster, true);
	// roof: two sloped panels
	const float Pitch = 0.5f;
	const float Hr = D / 2.f + 0.45f;
	const float Rise = Hr * FMath::Tan(Pitch);
	const float Sl = Hr / FMath::Cos(Pitch);
	for (int32 s = -1; s <= 1; s += 2)
	{
		const FVector SlopeDir(0.f, s * FMath::Cos(Pitch), -FMath::Sin(Pitch));
		const FRotator Rot = FRotationMatrix::MakeFromXY(FVector(1, 0, 0), SlopeDir).Rotator();
		SolidBox(FVector(W + 0.9f, Sl, 0.14f), FVector(X, Y + s * Hr / 2.f, Fl + Hgt + Rise / 2.f + 0.05f), Roof, false, Rot);
	}
	// gables (steps instead of triangles)
	for (int32 s = -1; s <= 1; s += 2)
		for (int32 k = 0; k < 4; ++k)
			SolidBox(FVector(0.25f, D * (1.f - (k + 0.5f) / 4.f), Rise / 4.f), FVector(X + s * (W / 2.f - 0.1f), Y, Fl + Hgt + (k + 0.5f) * Rise / 4.f), Plaster, false);
	// windows and doors
	const int32 NW = FMath::Max(2, (int32)(W / 3.4f));
	for (int32 s = -1; s <= 1; s += 2)
	{
		for (int32 i = 0; i < NW; ++i)
		{
			const float Px = X - W / 2.f + (i + 0.5f) * W / NW;
			if (s > 0 && i == NW / 2)
			{
				SolidBox(FVector(1.1f, 0.14f, 2.2f), FVector(Px, Y + D / 2.f + 0.02f, Fl + 1.1f), CRCol(108, 70, 44), false);
				continue;
			}
			SolidBox(FVector(1.0f, 0.12f, 1.2f), FVector(Px, Y + s * (D / 2.f + 0.02f), Fl + 1.8f), White, false);
			SolidBox(FVector(0.8f, 0.14f, 1.0f), FVector(Px, Y + s * (D / 2.f + 0.03f), Fl + 1.8f), Dark, false);
		}
	}
	const int32 ND = FMath::Max(1, (int32)(D / 4.f));
	for (int32 s = -1; s <= 1; s += 2)
		for (int32 i = 0; i < ND; ++i)
		{
			const float Pz = Y - D / 2.f + (i + 0.5f) * D / ND;
			SolidBox(FVector(0.12f, 1.0f, 1.2f), FVector(X + s * (W / 2.f + 0.02f), Pz, Fl + 1.8f), White, false);
			SolidBox(FVector(0.14f, 0.8f, 1.0f), FVector(X + s * (W / 2.f + 0.03f), Pz, Fl + 1.8f), Dark, false);
		}
	SolidBox(FVector(0.8f, 0.8f, 2.4f), FVector(X + W / 4.f, Y - D / 4.f, Fl + Hgt + Rise * 0.6f + 0.4f), CRCol(150, 78, 58), false);
	AddBlocker(X, Y, W, D);
	FMapRect MR; MR.Box = FBox2D(FVector2D(X - W / 2.f, Y - D / 2.f), FVector2D(X + W / 2.f, Y + D / 2.f)); MR.Color = FLinearColor(0.5f, 0.52f, 0.45f, 0.8f);
	MapRects.Add(MR);
}

void ACRWorldActor::Hangar(float X, float Y, float W, float D)
{
	const float H1 = H(X - W / 2.f, Y - D / 2.f), H2 = H(X + W / 2.f, Y - D / 2.f), H3 = H(X - W / 2.f, Y + D / 2.f), H4 = H(X + W / 2.f, Y + D / 2.f);
	const float Lo = FMath::Min(FMath::Min(H1, H2), FMath::Min(H3, H4));
	const float Hi = FMath::Max(FMath::Max(H1, H2), FMath::Max(H3, H4));
	const float Hgt = 5.5f;
	const float Fl = Hi + 0.1f;
	SolidBox(FVector(W + 0.2f, D + 0.2f, Fl - Lo + 0.6f), FVector(X, Y, Lo - 0.3f + (Fl - Lo + 0.6f) / 2.f), CRCol(120, 120, 114), true);
	SolidBox(FVector(W, D, Hgt), FVector(X, Y, Fl + Hgt / 2.f), CRCol(158, 154, 140), true);
	SolidBox(FVector(W + 0.7f, D + 0.7f, 0.4f), FVector(X, Y, Fl + Hgt + 0.2f), CRCol(104, 108, 104), false);
	SolidBox(FVector(W * 0.6f, 0.2f, 4.2f), FVector(X, Y + D / 2.f + 0.05f, Fl + 2.1f), CRCol(40, 44, 48), false);
	SolidBox(FVector(W, 0.22f, 0.5f), FVector(X, Y + D / 2.f + 0.06f, Fl + 4.8f), CRCol(200, 90, 30), false);
	AddBlocker(X, Y, W, D);
	FMapRect MR; MR.Box = FBox2D(FVector2D(X - W / 2.f, Y - D / 2.f), FVector2D(X + W / 2.f, Y + D / 2.f)); MR.Color = FLinearColor(0.55f, 0.55f, 0.5f, 0.8f);
	MapRects.Add(MR);
}

void ACRWorldActor::Runway()
{
	const float Cx = 34.f;
	for (int32 i = -7; i <= 7; ++i)
	{
		const float Y = i * 10.f;
		const float G = H(Cx, Y);
		SolidBox(FVector(24.f, 10.2f, 0.5f), FVector(Cx, Y, G + 0.12f), CRCol(70, 72, 74), false);
		if (i % 2 == 0) SolidBox(FVector(0.6f, 4.f, 0.52f), FVector(Cx, Y, G + 0.13f), CRCol(230, 230, 220), false);
	}
	AddBlocker(Cx, 0.f, 26.f, 150.f);
	FMapRect MR; MR.Box = FBox2D(FVector2D(Cx - 12.f, -75.f), FVector2D(Cx + 12.f, 75.f)); MR.Color = FLinearColor(0.35f, 0.35f, 0.38f, 0.8f);
	MapRects.Add(MR);
}

void ACRWorldActor::Ruin(float X, float Y)
{
	const FLinearColor Brick = CRCol(150, 88, 70);
	const float La = 5.f + Rng.FRand() * 5.f;
	const float Lb = 4.f + Rng.FRand() * 5.f;
	auto Wall = [&](float Cx, float Cy, float Len, bool bAlongX)
	{
		const int32 N = FMath::Max(3, (int32)(Len / 1.6f));
		const float Sg = Len / N;
		for (int32 i = 0; i < N; ++i)
		{
			const float Hh = 1.f + Rng.FRand() * (Rng.FRand() < 0.35f ? 3.f : 1.8f);
			const float Px = bAlongX ? Cx - Len / 2.f + (i + 0.5f) * Sg : Cx;
			const float Py = bAlongX ? Cy : Cy - Len / 2.f + (i + 0.5f) * Sg;
			const float G = H(Px, Py);
			SolidBox(bAlongX ? FVector(Sg, 0.5f, Hh + 0.6f) : FVector(0.5f, Sg, Hh + 0.6f), FVector(Px, Py, G + Hh / 2.f - 0.3f), Jit(Brick, 0.05f), true);
		}
	};
	Wall(X, Y, La, true);
	Wall(X + La / 2.f, Y + Lb / 2.f, Lb, false);
	AddBlocker(X, Y + Lb / 2.f, La, Lb + 2.f);
	UInstancedStaticMeshComponent* Rubble = FCRShapes::Inst(this, FCRShapes::SphereMesh(), CRCol(110, 104, 98), false, true);
	for (int32 i = 0; i < 7; ++i)
	{
		const float Px = X + (Rng.FRand() - 0.2f) * La;
		const float Py = Y + (Rng.FRand() - 0.1f) * Lb;
		Rubble->AddInstance(FTransform(FRotator(0, Rng.FRand() * 360.f, 0), Loc(Px, Py, H(Px, Py) + 0.2f), FVector(0.4f + Rng.FRand() * 0.8f, 0.4f + Rng.FRand() * 0.8f, 0.25f + Rng.FRand() * 0.4f)));
	}
}

// ---------------- props ----------------
void ACRWorldActor::BuildProps()
{
	const FLinearColor Wood = CRCol(150, 108, 66);
	for (int32 i = 0; i < 14; ++i)
	{
		const FVector2D P = FreeSpot(true, 14.f, 2.5f, 68.f);
		const float G = H(P.X, P.Y);
		SolidBox(FVector(1.2f, 1.2f, 1.2f), FVector(P.X, P.Y, G + 0.6f), Wood, true, FRotator(0, Rng.FRand() * 40.f, 0));
		if (Rng.FRand() < 0.6f) SolidBox(FVector(1.f, 1.f, 1.f), FVector(P.X + 0.3f, P.Y, G + 1.7f), Jit(Wood, 0.04f), false, FRotator(0, Rng.FRand() * 90.f, 0));
		AddBlocker(P.X, P.Y, 1.4f, 1.4f);
	}
	for (int32 i = 0; i < 8; ++i)
	{
		const FVector2D P = FreeSpot(true, 14.f, 3.f, 68.f);
		const float G = H(P.X, P.Y);
		const bool bH = Rng.FRand() < 0.5f;
		const FVector Sz = bH ? FVector(3.4f, 0.8f, 1.0f) : FVector(0.8f, 3.4f, 1.0f);
		SolidBox(Sz, FVector(P.X, P.Y, G + 0.5f), CRCol(168, 150, 112), true);
		AddBlocker(P.X, P.Y, Sz.X, Sz.Y);
		FMapRect MR; MR.Box = FBox2D(FVector2D(P.X - Sz.X / 2.f, P.Y - Sz.Y / 2.f), FVector2D(P.X + Sz.X / 2.f, P.Y + Sz.Y / 2.f)); MR.Color = FLinearColor(0.6f, 0.55f, 0.4f, 0.8f);
		MapRects.Add(MR);
	}
	const FLinearColor BarrelCols[3] = { CRCol(122, 42, 28), CRCol(42, 74, 106), CRCol(74, 90, 40) };
	for (int32 i = 0; i < 8; ++i)
	{
		const FVector2D P = FreeSpot(true, 12.f, 2.f, 68.f);
		FCRShapes::Cyl(this, nullptr, 30.f, 90.f, Loc(P.X, P.Y, H(P.X, P.Y) + 0.45f), BarrelCols[i % 3], FRotator::ZeroRotator, TEXT("BlockAll"));
		AddBlocker(P.X, P.Y, 0.8f, 0.8f);
	}
	for (int32 i = 0; i < 3 + LevelIndex; ++i)
	{
		const FVector2D P = FreeSpot(true, 22.f, 4.f, 64.f);
		Car(P.X, P.Y);
	}
}

void ACRWorldActor::Car(float X, float Y)
{
	const float G = H(X, Y);
	const bool bRot = Rng.FRand() < 0.5f;
	const FRotator Rot(0.f, bRot ? 90.f : 0.f, 0.f);
	const FLinearColor Rust = CRCol(74, 52, 40);
	const FLinearColor Dk = CRCol(12, 12, 12);
	const FVector Sz = bRot ? FVector(1.9f, 4.3f, 1.6f) : FVector(4.3f, 1.9f, 1.6f);
	// collision box
	SolidBox(Sz, FVector(X, Y, G + 0.8f), Rust, true);
	const FRotationMatrix RM(Rot);
	auto W = [&](float Lx, float Ly, float Lz) { const FVector V = RM.TransformVector(FVector(Lx, Ly, Lz)); return FVector(X + V.X, Y + V.Y, G + V.Z); };
	SolidBox(FVector(2.2f, 1.6f, 0.7f), W(-0.2f, 0.f, 1.65f), CRCol(60, 44, 36), false, Rot);
	for (float Sx : { -1.4f, 1.4f })
		for (float Sy : { -0.9f, 0.9f })
			FCRShapes::Cyl(this, nullptr, 34.f, 25.f, Loc(W(Sx, Sy, 0.34f).X, W(Sx, Sy, 0.34f).Y, W(Sx, Sy, 0.34f).Z), Dk, FRotator(0, Rot.Yaw, 90.f));
	AddBlocker(X, Y, Sz.X, Sz.Y);
	FMapRect MR; MR.Box = FBox2D(FVector2D(X - Sz.X / 2.f, Y - Sz.Y / 2.f), FVector2D(X + Sz.X / 2.f, Y + Sz.Y / 2.f)); MR.Color = FLinearColor(0.45f, 0.4f, 0.36f, 0.8f);
	MapRects.Add(MR);
}

// ---------------- vegetation ----------------
void ACRWorldActor::BuildVegetation()
{
	UStaticMesh* Cyl = FCRShapes::CylMesh();
	UStaticMesh* Sph = FCRShapes::SphereMesh();
	UStaticMesh* Cone = FCRShapes::ConeMesh();
	const FLinearColor Greens[4] = { CRCol(110, 153, 74), CRCol(92, 138, 61), CRCol(122, 163, 82), CRCol(79, 122, 56) };
	UInstancedStaticMeshComponent* Trunk = FCRShapes::Inst(this, Cyl, CRCol(75, 58, 40), true, true);
	UInstancedStaticMeshComponent* Fol[4];
	for (int32 k = 0; k < 4; ++k) Fol[k] = FCRShapes::Inst(this, Sph, Greens[k], false, true);
	for (int32 i = 0; i < (Lvl.bDesert ? 8 : 70); ++i)
	{
		const float X = (Rng.FRand() - 0.5f) * 150.f;
		const float Y = (Rng.FRand() - 0.5f) * 150.f;
		if (FMath::Abs(X) < 8.f || Blocked(X, Y, 2.f)) continue;
		const float S = 0.9f + Rng.FRand() * 0.7f;
		const float G = H(X, Y);
		Trunk->AddInstance(FTransform(FRotator::ZeroRotator, Loc(X, Y, G + 2.5f * S), FVector(0.4f * S, 0.4f * S, 5.f * S)));
		const FVector Offs[3] = { FVector(0, 0, 5.4f), FVector(1.1f, 0.4f, 4.5f), FVector(-0.9f, -0.6f, 4.8f) };
		for (int32 b = 0; b < 3; ++b)
		{
			const float Sc = (b == 0 ? 2.3f : 1.65f) * S;
			Fol[(i + b) % 4]->AddInstance(FTransform(FRotator(0, Rng.FRand() * 360.f, 0), Loc(X, Y, G) + Offs[b] * S * 100.f, FVector(Sc * 2.f, Sc * 2.f, Sc * 1.7f)));
		}
		AddBlocker(X, Y, 0.8f, 0.8f);
	}
	// pines in the mountains behind the fences
	UInstancedStaticMeshComponent* Pine[2] = { FCRShapes::Inst(this, Cone, CRCol(52, 84, 52), false, false), FCRShapes::Inst(this, Cone, CRCol(64, 102, 62), false, false) };
	for (int32 i = 0; i < (Lvl.bDesert ? 80 : 900); ++i)
	{
		const float A = Rng.FRand() * 2.f * PI;
		const float R = 84.f + Rng.FRand() * 110.f;
		const float X = FMath::Cos(A) * R, Y = FMath::Sin(A) * R;
		const float G = H(X, Y);
		if (G > 52.f) continue;
		const float S = 4.f + Rng.FRand() * 5.f;
		Pine[i % 2]->AddInstance(FTransform(FRotator::ZeroRotator, Loc(X, Y, G + S * 0.5f), FVector(S * 0.7f, S * 0.7f, S)));
		Pine[i % 2]->AddInstance(FTransform(FRotator::ZeroRotator, Loc(X, Y, G + S * 1.0f), FVector(S * 0.5f, S * 0.5f, S * 0.8f)));
	}
	// rocks: small ones on the map (some with collision) and big cliffs behind the fences
	UInstancedStaticMeshComponent* RockSolid = FCRShapes::Inst(this, Sph, CRCol(130, 124, 116), true, true);
	UInstancedStaticMeshComponent* RockDeco = FCRShapes::Inst(this, Sph, CRCol(118, 112, 104), false, true);
	for (int32 i = 0; i < (Lvl.bDesert ? 110 : 46); ++i)
	{
		const FVector2D P = FreeSpot(true, 12.f, 3.f, 74.f);
		const float S = 0.5f + Rng.FRand() * 1.6f;
		const float G = H(P.X, P.Y);
		const FTransform T(FRotator(0, Rng.FRand() * 360.f, 0), Loc(P.X, P.Y, G + S * 0.25f), FVector(S * (1.f + Rng.FRand()) * 2.f, S * (1.f + Rng.FRand()) * 2.f, S * (0.5f + Rng.FRand() * 0.5f) * 2.f));
		if (S > 1.25f) { RockSolid->AddInstance(T); AddBlocker(P.X, P.Y, S * 1.6f, S * 1.6f); }
		else RockDeco->AddInstance(T);
	}
	for (int32 i = 0; i < 200; ++i)
	{
		const float A = Rng.FRand() * 2.f * PI;
		const float R = 88.f + Rng.FRand() * 95.f;
		const float X = FMath::Cos(A) * R, Y = FMath::Sin(A) * R;
		const float S = 3.f + Rng.FRand() * 9.f;
		RockDeco->AddInstance(FTransform(FRotator(0, Rng.FRand() * 360.f, 0), Loc(X, Y, H(X, Y) + S * 0.25f), FVector(S * (1.f + Rng.FRand() * 0.6f) * 2.f, S * (1.f + Rng.FRand() * 0.6f) * 2.f, S * (0.6f + Rng.FRand() * 0.9f) * 2.f)));
	}
	// bushes with flowers
	UInstancedStaticMeshComponent* Bush[3];
	for (int32 k = 0; k < 3; ++k) Bush[k] = FCRShapes::Inst(this, Sph, Greens[k], false, false);
	const FLinearColor FlCols[4] = { CRCol(242, 166, 204), CRCol(247, 240, 230), CRCol(237, 211, 107), CRCol(217, 120, 176) };
	UInstancedStaticMeshComponent* Flower[4];
	for (int32 k = 0; k < 4; ++k) Flower[k] = FCRShapes::Inst(this, Sph, FlCols[k], false, false);
	for (int32 i = 0; i < (Lvl.bDesert ? 25 : 150); ++i)
	{
		const float X = (Rng.FRand() - 0.5f) * 150.f;
		const float Y = (Rng.FRand() - 0.5f) * 150.f;
		if (FMath::Abs(X) < 5.f || Blocked(X, Y, 1.5f)) continue;
		const float S = 0.6f + Rng.FRand() * 0.9f;
		const float G = H(X, Y);
		Bush[i % 3]->AddInstance(FTransform(FRotator(0, Rng.FRand() * 360.f, 0), Loc(X, Y, G + 0.4f * S), FVector(2.6f * S, 2.6f * S, 1.6f * S)));
		if (Rng.FRand() < 0.55f)
			for (int32 k = 0; k < 5; ++k)
			{
				const float Aa = Rng.FRand() * 2.f * PI, Rr = Rng.FRand() * S;
				Flower[i % 4]->AddInstance(FTransform(FRotator::ZeroRotator, Loc(X + FMath::Cos(Aa) * Rr, Y + FMath::Sin(Aa) * Rr, G + 0.55f * S + Rng.FRand() * 0.3f * S), FVector(0.14f)));
			}
	}
}
