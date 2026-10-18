#pragma once
#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "CRTypes.h"
#include "CRHUD.generated.h"

class ACRGameMode;
class ACRCharacter;
class UCRGameInstance;
class UCRSaveGame;

/**
 * The whole UI is drawn through the Canvas: main menu, mission selection, settings, store, HUD, pause and mission end.
 * Texts are plain ASCII because the default engine font may lack special characters.
 */
UCLASS()
class CERNYRAD_API ACRHUD : public AHUD
{
	GENERATED_BODY()
public:
	enum class EScreen : uint8 { Main, Play, Multi, Settings, Store };
	EScreen Screen = EScreen::Main;

	void AddBlood(float Dmg);
	void HitMarker();

	virtual void DrawHUD() override;
	virtual void NotifyHitBoxClick(FName BoxName) override;
	virtual void NotifyHitBoxBeginCursorOver(FName BoxName) override;
	virtual void NotifyHitBoxEndCursorOver(FName BoxName) override;

protected:
	struct FBlood { FVector2D Pos; float R; float T0; };
	struct FSlider { float X, Y, W, H, Min, Max; };
	TArray<FBlood> Bloods;
	TMap<FName, FSlider> Sliders;
	FName Hover;
	float HitT = 0.f;
	float U = 1.f; // UI scale
	int32 SettingsTab = 0;
	int32 PlayCampaign = 0;
	ECRSlot StoreTab = ECRSlot::Primary;
	FString StoreMsg;
	FString MultiMsg;
	FString PartyCode;
	FString JoinCode;

	ACRGameMode* GM() const;
	UCRSaveGame* Prof() const;
	UCRGameInstance* GInst() const;
	UFont* FontL() const;

	// drawing
	void Txt(const FString& S, float X, float Y, const FLinearColor& C, float Scale, bool bCenter = false, bool bRight = false);
	void Panel(float X, float Y, float W, float H, const FLinearColor& C);
	bool Btn(const FString& Label, float X, float Y, float W, float H, FName Id, bool bEnabled = true, float Scale = 0.8f);
	void Disc(float X, float Y, float R, const FLinearColor& C, int32 N = 28);
	void Ring(float Cx, float Cy, float R0, float R1, const FLinearColor& C, int32 N = 64);
	void Slider(const FString& Label, FName Id, float X, float Y, float W, float Value, float Min, float Max);

	void DrawMenu();
	void DrawMain();
	void DrawPlay();
	void DrawMulti();
	void DrawSettings();
	void DrawStore();
	void DrawGame();
	void DrawMinimap(ACRCharacter* P);
	void DrawOverlay(const FString& Title, const FString& Text);
	void Back();
};
