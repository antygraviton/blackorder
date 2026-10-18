#include "CRGun.h"
#include "CRUtil.h"
#include "Components/StaticMeshComponent.h"

// Dimensions are given in meters in "Godot" axes (x right, y up, -z forward)
// and are converted here to Unreal axes (X forward, Y right, Z up) in centimeters.
static FVector GP(float X, float Y, float Z) { return FVector(-Z * 100.f, X * 100.f, Y * 100.f); }

namespace
{
	struct FBuilder
	{
		AActor* Owner;
		USceneComponent* Parent;
		TArray<UPrimitiveComponent*>* Out;
		bool bDetail;

		void Add(UPrimitiveComponent* C) { if (C && Out) Out->Add(C); }
		void B(float SX, float SY, float SZ, float PX, float PY, float PZ, const FLinearColor& Col, float RotX = 0.f)
		{
			Add(FCRShapes::Box(Owner, Parent, FVector(SZ * 100.f, SX * 100.f, SY * 100.f), GP(PX, PY, PZ), Col, FRotator(-RotX * 57.2958f, 0.f, 0.f)));
		}
		// cylinder along the firing direction (X axis)
		void C(float R, float Len, float PX, float PY, float PZ, const FLinearColor& Col)
		{
			Add(FCRShapes::Cyl(Owner, Parent, R * 100.f, Len * 100.f, GP(PX, PY, PZ), Col, FRotator(90.f, 0.f, 0.f)));
		}
	};
}

FCRGunInfo CRBuildGun(AActor* Owner, USceneComponent* Parent, FName Id, bool bDetail, TArray<UPrimitiveComponent*>* Out)
{
	FBuilder G{ Owner, Parent, Out, bDetail };
	const FLinearColor Black = CRCol(24, 24, 27);
	const FLinearColor Tan = CRCol(178, 148, 102);
	const FLinearColor Poly = CRCol(36, 36, 38);
	const FLinearColor Wood = CRCol(100, 58, 30);
	const FLinearColor Steel = CRCol(140, 144, 150);
	const FLinearColor Orange = CRCol(108, 52, 20);
	const FLinearColor Tube = CRCol(15, 15, 17);
	FCRGunInfo I;
	auto SetInfo = [&](float MX, float MY, float MZ, float RX, float RY, float RZ, float LX, float LY, float LZ, float Sy, bool bLH)
	{
		I.Muzzle = GP(MX, MY, MZ); I.bHasMuzzle = true;
		I.RH = GP(RX, RY, RZ);
		I.LH = GP(LX, LY, LZ); I.bHasLH = bLH;
		I.SightZ = Sy * 100.f;
	};

	if (Id == TEXT("hk416"))
	{
		G.B(.05f, .07f, .22f, 0, -.045f, -.13f, Tan);
		G.B(.052f, .062f, .32f, 0, .018f, -.2f, Tan);
		G.B(.03f, .012f, .6f, 0, .056f, -.32f, Tube);
		G.B(.064f, .068f, .34f, 0, .012f, -.52f, Tan);
		G.C(.0095f, .14f, 0, .014f, -.74f, Black);
		G.C(.016f, .075f, 0, .014f, -.82f, Black);
		G.B(.034f, .17f, .07f, 0, -.15f, -.15f, Black, .1f);
		G.B(.036f, .11f, .05f, 0, -.115f, -.02f, Poly, .4f);
		G.C(.016f, .2f, 0, .012f, .06f, Tan);
		G.B(.042f, .1f, .17f, 0, -.008f, .2f, Tan);
		// optic (hollow tube made of four plates)
		G.B(.05f, .006f, .1f, 0, .1f + .025f, -.24f, Tube);
		G.B(.05f, .006f, .1f, 0, .1f - .025f, -.24f, Tube);
		G.B(.006f, .05f, .1f, .025f, .1f, -.24f, Tube);
		G.B(.006f, .05f, .1f, -.025f, .1f, -.24f, Tube);
		G.B(.03f, .03f, .07f, 0, .075f, -.24f, Black);
		if (bDetail) for (int32 i = 0; i < 4; ++i) G.B(.066f, .014f, .05f, 0, .012f, -.4f - i * .07f, Black);
		SetInfo(0, .014f, -.87f, 0, -.115f, -.02f, 0, -.035f, -.52f, .1f, true);
	}
	else if (Id == TEXT("ak") || Id == TEXT("bayonet"))
	{
		G.B(.05f, .075f, .3f, 0, 0, -.18f, Black);
		G.B(.044f, .03f, .3f, 0, .05f, -.18f, Black);
		G.B(.054f, .05f, .22f, 0, -.005f, -.46f, Wood);
		G.B(.05f, .03f, .2f, 0, .04f, -.46f, Wood);
		G.C(.011f, .22f, 0, .07f, -.5f, Black);
		G.C(.0095f, .3f, 0, .02f, -.7f, Black);
		G.C(.015f, .06f, 0, .02f, -.86f, Black);
		G.B(.012f, .04f, .012f, 0, .045f, -.82f, Black);
		G.B(.034f, .1f, .07f, 0, -.1f, -.16f, Orange, .15f);
		G.B(.034f, .1f, .07f, 0, -.19f, -.12f, Orange, .5f);
		G.B(.038f, .11f, .05f, 0, -.1f, -.04f, Wood, .35f);
		G.B(.04f, .09f, .3f, 0, -.01f, .2f, Wood);
		if (Id == TEXT("bayonet")) { G.B(.012f, .035f, .22f, 0, -.012f, -1.0f, Steel); G.B(.012f, .02f, .05f, 0, .008f, -.9f, Black); }
		SetInfo(0, .02f, -.9f, 0, -.1f, -.04f, 0, -.03f, -.46f, .078f, true);
	}
	else if (Id == TEXT("mp5"))
	{
		G.B(.05f, .07f, .3f, 0, 0, -.18f, Black);
		G.B(.058f, .055f, .22f, 0, -.01f, -.45f, Poly);
		G.C(.011f, .08f, 0, .01f, -.62f, Black);
		G.B(.012f, .03f, .012f, 0, .035f, -.66f, Black);
		G.B(.032f, .12f, .06f, 0, -.12f, -.2f, Black, .05f);
		G.B(.032f, .1f, .06f, 0, -.22f, -.19f, Black, .15f);
		G.B(.036f, .11f, .05f, 0, -.1f, -.04f, Poly, .35f);
		G.C(.009f, .22f, .025f, .01f, .12f, Black);
		G.B(.04f, .09f, .03f, 0, 0, .23f, Black);
		SetInfo(0, .01f, -.67f, 0, -.1f, -.04f, 0, -.03f, -.44f, .065f, true);
	}
	else if (Id == TEXT("svd"))
	{
		G.B(.052f, .075f, .28f, 0, 0, -.17f, Black);
		G.B(.05f, .05f, .3f, 0, -.005f, -.5f, Wood);
		G.C(.013f, .4f, 0, .02f, -.85f, Black);
		G.C(.018f, .07f, 0, .02f, -1.07f, Black);
		G.B(.045f, .1f, .34f, 0, -.02f, .2f, Wood);
		G.B(.034f, .1f, .07f, 0, -.1f, -.15f, Black, .1f);
		G.B(.04f, .04f, .2f, 0, .098f, -.2f, Tube);
		G.B(.056f, .056f, .06f, 0, .098f, -.32f, Tube);
		G.B(.03f, .03f, .1f, 0, .07f, -.2f, Black);
		SetInfo(0, .02f, -1.12f, 0, -.1f, -.03f, 0, -.03f, -.5f, .098f, true);
	}
	else if (Id == TEXT("shotgun"))
	{
		G.B(.05f, .07f, .22f, 0, 0, -.13f, Black);
		G.C(.013f, .6f, 0, .02f, -.55f, Black);
		G.C(.012f, .5f, 0, -.03f, -.5f, Black);
		G.B(.05f, .05f, .2f, 0, -.03f, -.45f, Wood);
		G.B(.045f, .09f, .3f, 0, -.02f, .17f, Wood);
		G.B(.04f, .1f, .05f, 0, -.09f, -.02f, Wood, .3f);
		SetInfo(0, .02f, -.86f, 0, -.09f, -.02f, 0, -.03f, -.45f, .06f, true);
	}
	else if (Id == TEXT("glock"))
	{
		G.B(.03f, .036f, .2f, 0, .03f, -.1f, Black);
		G.B(.028f, .022f, .17f, 0, 0, -.1f, Poly);
		G.B(.03f, .1f, .045f, 0, -.05f, 0, Poly, -.2f);
		G.B(.012f, .03f, .05f, 0, -.025f, -.12f, Poly);
		G.B(.006f, .012f, .008f, 0, .054f, -.19f, Black);
		G.B(.01f, .012f, .008f, 0, .054f, -.015f, Black);
		SetInfo(0, .03f, -.22f, 0, -.04f, 0, -.02f, -.06f, -.02f, .056f, true);
	}
	else if (Id == TEXT("revolver"))
	{
		G.B(.028f, .05f, .14f, 0, 0, -.07f, Steel);
		G.C(.026f, .06f, 0, .012f, -.14f, Steel);
		G.C(.008f, .17f, 0, .012f, -.255f, Steel);
		G.B(.012f, .02f, .17f, 0, .04f, -.25f, Steel);
		G.B(.01f, .03f, .015f, 0, .04f, -.015f, Steel, -.4f);
		G.B(.032f, .1f, .045f, 0, -.06f, 0, Wood, -.25f);
		SetInfo(0, .012f, -.345f, 0, -.05f, 0, -.02f, -.065f, -.02f, .05f, true);
	}
	else if (Id == TEXT("knife"))
	{
		G.B(.012f, .045f, .24f, 0, 0, -.14f, Steel);
		G.B(.012f, .02f, .06f, 0, .012f, -.3f, Steel);
		G.B(.012f, .05f, .012f, 0, 0, -.02f, Black);
		G.C(.016f, .11f, 0, 0, .04f, Poly);
		SetInfo(0, 0, 0, 0, -.005f, .045f, 0, 0, 0, 0.f, false);
		I.bHasMuzzle = false;
	}
	else if (Id == TEXT("rpg"))
	{
		G.C(.04f, .9f, 0, .03f, -.45f, Black);
		G.C(.065f, .22f, 0, .03f, -1.0f, Orange);
		G.B(.06f, .09f, .22f, 0, -.01f, -.05f, Poly);
		G.B(.036f, .11f, .05f, 0, -.1f, -.2f, Poly, .3f);
		G.B(.02f, .05f, .05f, 0, .09f, -.3f, Black);
		SetInfo(0, .03f, -1.15f, 0, -.1f, -.2f, 0, -.03f, -.62f, .09f, true);
	}
	else if (Id == TEXT("bow"))
	{
		G.B(.03f, .18f, .04f, 0, 0, -.38f, Wood);
		G.B(.02f, .26f, .02f, 0, .2f, -.34f, Wood, .35f);
		G.B(.02f, .26f, .02f, 0, -.2f, -.34f, Wood, -.35f);
		G.B(.004f, .5f, .004f, 0, 0, -.22f, Steel);
		G.B(.008f, .008f, .65f, 0, .02f, -.5f, Wood);
		G.B(.012f, .02f, .03f, 0, .02f, -.83f, Steel);
		SetInfo(0, .02f, -.83f, 0, 0, -.22f, 0, 0, -.38f, .05f, true);
	}
	else if (Id == TEXT("dpistol"))
	{
		for (int32 k = -1; k <= 1; k += 2)
		{
			const float X = k * .045f;
			G.B(.03f, .036f, .2f, X, .03f, -.1f, Black);
			G.B(.028f, .022f, .17f, X, 0, -.1f, Poly);
			G.B(.03f, .1f, .045f, X, -.05f, 0, Poly, -.2f);
			G.B(.012f, .03f, .05f, X, -.025f, -.12f, Poly);
		}
		SetInfo(0, .03f, -.22f, .045f, -.04f, 0, -.045f, -.04f, 0, .056f, true);
	}
	else if (Id == TEXT("napalm"))
	{
		G.B(.04f, .045f, .22f, 0, .03f, -.11f, Poly);
		G.B(.03f, .1f, .045f, 0, -.05f, 0, Poly, -.2f);
		G.C(.035f, .16f, 0, -.012f, -.16f, Orange);
		G.C(.012f, .08f, 0, .03f, -.26f, Steel);
		SetInfo(0, .03f, -.3f, 0, -.04f, 0, -.02f, -.06f, -.02f, .056f, true);
	}
	else if (Id == TEXT("hardbass"))
	{
		G.B(.04f, .045f, .2f, 0, .03f, -.1f, Poly);
		G.B(.03f, .1f, .045f, 0, -.05f, 0, Poly, -.2f);
		G.C(.055f, .03f, 0, .03f, -.22f, Orange);
		G.C(.04f, .04f, 0, .03f, -.24f, Black);
		SetInfo(0, .03f, -.26f, 0, -.04f, 0, -.02f, -.06f, -.02f, .056f, true);
	}
	else if (Id == TEXT("machete"))
	{
		G.B(.012f, .075f, .42f, 0, .005f, -.28f, Steel);
		G.B(.012f, .09f, .015f, 0, 0, -.06f, Black);
		G.C(.016f, .12f, 0, 0, .0f, Poly);
		SetInfo(0, 0, 0, 0, -.005f, .0f, 0, 0, 0, 0.f, false);
		I.bHasMuzzle = false;
	}
	else if (Id == TEXT("hammer"))
	{
		G.C(.016f, .5f, 0, 0, -.2f, Wood);
		G.B(.13f, .06f, .06f, 0, 0, -.46f, Black);
		SetInfo(0, 0, 0, 0, -.005f, .0f, 0, 0, 0, 0.f, false);
		I.bHasMuzzle = false;
	}
	else if (Id == TEXT("crossbow"))
	{
		G.B(.04f, .05f, .5f, 0, -.01f, -.3f, Wood);
		G.B(.5f, .02f, .025f, 0, .005f, -.55f, Black);
		G.B(.004f, .004f, .3f, 0, .01f, -.45f, Steel);
		G.B(.008f, .008f, .38f, 0, .03f, -.45f, Wood);
		G.B(.036f, .09f, .05f, 0, -.1f, -.12f, Poly, .2f);
		SetInfo(0, .03f, -.64f, 0, -.07f, -.1f, 0, -.04f, -.42f, .06f, true);
	}
	else if (Id == TEXT("shield"))
	{
		G.B(.6f, .78f, .05f, -.04f, .0f, -.38f, CRCol(40, 50, 64));
		G.B(.34f, .09f, .056f, -.04f, .2f, -.38f, CRCol(120, 150, 170));
		G.B(.55f, .03f, .06f, -.04f, -.36f, -.38f, Black);
		SetInfo(0, 0, 0, -.1f, -.05f, -.28f, -.1f, -.05f, -.28f, 0.f, false);
		I.bHasMuzzle = false;
	}
	else if (Id == TEXT("dynamite"))
	{
		for (int32 k = -1; k <= 1; ++k) G.C(.022f, .2f, k * .045f, 0, -.03f, CRCol(190, 40, 30));
		G.B(.14f, .012f, .02f, 0, 0, -.03f, Black);
		G.B(.004f, .06f, .004f, 0, .04f, -.13f, Steel);
		SetInfo(0, 0, 0, 0, -.03f, 0, 0, 0, 0, 0.f, false);
		I.bHasMuzzle = false;
	}
	else if (Id == TEXT("smoke"))
	{
		G.C(.035f, .14f, 0, 0, 0, CRCol(120, 124, 120));
		G.C(.037f, .02f, 0, 0, 0, Black);
		SetInfo(0, 0, 0, 0, -.03f, 0, 0, 0, 0, 0.f, false);
		I.bHasMuzzle = false;
	}
	else if (Id == TEXT("flash"))
	{
		G.C(.03f, .13f, 0, 0, 0, CRCol(40, 44, 50));
		G.C(.032f, .02f, 0, 0, 0, Orange);
		SetInfo(0, 0, 0, 0, -.03f, 0, 0, 0, 0, 0.f, false);
		I.bHasMuzzle = false;
	}
	else // m67
	{
		if (G.Out) G.Out->Add(FCRShapes::Ball(Owner, Parent, FVector(3.6f, 3.6f, 3.6f), FVector::ZeroVector, CRCol(72, 84, 46)));
		G.C(.012f, .03f, 0, .04f, 0, Steel);
		G.B(.012f, .07f, .006f, .028f, .045f, 0, Steel);
		SetInfo(0, 0, 0, 0, -.03f, 0, 0, 0, 0, 0.f, false);
		I.bHasMuzzle = false;
	}
	return I;
}

void CRAddHands(AActor* Owner, USceneComponent* Parent, const FCRGunInfo& Info, bool bHasRH, TArray<UPrimitiveComponent*>* Out)
{
	const FLinearColor Glove = CRCol(23, 23, 26);
	const FLinearColor Sleeve = CRCol(78, 90, 54);
	auto Add = [&](UPrimitiveComponent* C) { if (C && Out) Out->Add(C); };
	auto Hand = [&](const FVector& P, float Flip)
	{
		Add(FCRShapes::Box(Owner, Parent, FVector(9.f, 8.f, 4.f), P, Glove));
		for (int32 i = 0; i < 4; ++i)
			Add(FCRShapes::Box(Owner, Parent, FVector(5.f, 1.6f, 1.6f), P + FVector(6.f, -2.7f + i * 1.8f, -1.8f), Glove));
		Add(FCRShapes::Box(Owner, Parent, FVector(5.f, 2.2f, 2.2f), P + FVector(3.f, Flip * 4.5f, 0.4f), Glove));
		Add(FCRShapes::Box(Owner, Parent, FVector(4.f, 8.5f, 5.f), P + FVector(-6.5f, 0.f, 0.f), CRCol(30, 30, 32)));
	};
	Hand(Info.RH, -1.f);
	Add(FCRShapes::Limb(Owner, Parent, Info.RH + FVector(-5.f, 1.f, 0.f), Info.RH + FVector(-50.f, 15.f, -30.f), 4.5f, 5.f, Sleeve));
	if (Info.bHasLH)
	{
		Hand(Info.LH, 1.f);
		Add(FCRShapes::Limb(Owner, Parent, Info.LH + FVector(-5.f, 0.f, 0.f), Info.LH + FVector(-55.f, -28.f, -28.f), 4.5f, 5.f, Sleeve));
	}
}
