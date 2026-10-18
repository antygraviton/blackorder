#include "CRHUD.h"
#include "CRCharacter.h"
#include "CRGameInstance.h"
#include "CRGameMode.h"
#include "CRVehicle.h"
#include "CREnemy.h"
#include "CRSaveGame.h"
#include "CRWorldActor.h"
#include "CanvasItem.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "RenderResource.h"

static const FLinearColor KBone(0.80f, 0.77f, 0.68f, 1.f);
static const FLinearColor KDim(0.45f, 0.48f, 0.45f, 1.f);
static const FLinearColor KOlive(0.38f, 0.45f, 0.24f, 1.f);
static const FLinearColor KPanel(0.04f, 0.06f, 0.07f, 0.88f);
static const FLinearColor KRed(0.8f, 0.2f, 0.12f, 1.f);

ACRGameMode* ACRHUD::GM() const { return GetWorld() ? GetWorld()->GetAuthGameMode<ACRGameMode>() : nullptr; }
UCRGameInstance* ACRHUD::GInst() const { return GetGameInstance<UCRGameInstance>(); }
UCRSaveGame* ACRHUD::Prof() const { UCRGameInstance* G = GInst(); return G ? G->Profile : nullptr; }
UFont* ACRHUD::FontL() const { return GEngine->GetLargeFont(); }

void ACRHUD::AddBlood(float Dmg)
{
	const int32 N = 1 + (int32)(Dmg / 7.f);
	const float Now = GetWorld()->GetTimeSeconds();
	for (int32 i = 0; i < N; ++i)
	{
		FBlood B;
		B.Pos = FVector2D(FMath::FRand(), FMath::FRand());   // 0-1 fraction of the screen
		B.R = FMath::FRandRange(0.06f, 0.18f);               // fraction of the screen height
		B.T0 = Now;
		Bloods.Add(B);
	}
	while (Bloods.Num() > 22) Bloods.RemoveAt(0);
}

void ACRHUD::HitMarker() { HitT = 0.15f; }

void ACRHUD::NotifyHitBoxBeginCursorOver(FName BoxName) { Hover = BoxName; }
void ACRHUD::NotifyHitBoxEndCursorOver(FName BoxName) { if (Hover == BoxName) Hover = NAME_None; }

// ---------------- drawing ----------------
void ACRHUD::Txt(const FString& S, float X, float Y, const FLinearColor& C, float Scale, bool bCenter, bool bRight)
{
	float W = 0.f, H = 0.f;
	GetTextSize(S, W, H, FontL(), Scale * U);
	if (bCenter) X -= W * 0.5f;
	if (bRight) X -= W;
	DrawText(S, C, X, Y, FontL(), Scale * U, false);
}

void ACRHUD::Panel(float X, float Y, float W, float H, const FLinearColor& C)
{
	DrawRect(C, X, Y, W, H);
}

bool ACRHUD::Btn(const FString& Label, float X, float Y, float W, float H, FName Id, bool bEnabled, float Scale)
{
	const bool bHover = bEnabled && Hover == Id;
	FLinearColor Bg = bEnabled ? (bHover ? FLinearColor(0.25f, 0.30f, 0.18f, 0.95f) : FLinearColor(0.09f, 0.12f, 0.14f, 0.92f)) : FLinearColor(0.07f, 0.08f, 0.09f, 0.6f);
	DrawRect(Bg, X, Y, W, H);
	DrawRect(bHover ? KOlive : FLinearColor(0.16f, 0.2f, 0.23f, 1.f), X, Y, W, 2.f * U);
	float TW = 0.f, TH = 0.f;
	GetTextSize(Label, TW, TH, FontL(), Scale * U);
	DrawText(Label, bEnabled ? KBone : KDim, X + (W - TW) * 0.5f, Y + (H - TH) * 0.5f, FontL(), Scale * U, false);
	if (bEnabled) AddHitBox(FVector2D(X, Y), FVector2D(W, H), Id, true, 1);
	return bHover;
}

void ACRHUD::Disc(float X, float Y, float R, const FLinearColor& C, int32 N)
{
	if (!Canvas) return;
	for (int32 i = 0; i < N; ++i)
	{
		const float A0 = 2.f * PI * i / N, A1 = 2.f * PI * (i + 1) / N;
		FCanvasTriangleItem T(FVector2D(X, Y), FVector2D(X + FMath::Cos(A0) * R, Y + FMath::Sin(A0) * R), FVector2D(X + FMath::Cos(A1) * R, Y + FMath::Sin(A1) * R), GWhiteTexture);
		T.SetColor(C);
		T.BlendMode = SE_BLEND_Translucent;
		Canvas->DrawItem(T);
	}
}

void ACRHUD::Ring(float Cx, float Cy, float R0, float R1, const FLinearColor& C, int32 N)
{
	if (!Canvas) return;
	for (int32 i = 0; i < N; ++i)
	{
		const float A0 = 2.f * PI * i / N, A1 = 2.f * PI * (i + 1) / N;
		const FVector2D P0(Cx + FMath::Cos(A0) * R0, Cy + FMath::Sin(A0) * R0), P1(Cx + FMath::Cos(A1) * R0, Cy + FMath::Sin(A1) * R0);
		const FVector2D Q0(Cx + FMath::Cos(A0) * R1, Cy + FMath::Sin(A0) * R1), Q1(Cx + FMath::Cos(A1) * R1, Cy + FMath::Sin(A1) * R1);
		FCanvasTriangleItem T1(P0, Q0, P1, GWhiteTexture);
		T1.SetColor(C); T1.BlendMode = SE_BLEND_Translucent; Canvas->DrawItem(T1);
		FCanvasTriangleItem T2(P1, Q0, Q1, GWhiteTexture);
		T2.SetColor(C); T2.BlendMode = SE_BLEND_Translucent; Canvas->DrawItem(T2);
	}
}

void ACRHUD::Slider(const FString& Label, FName Id, float X, float Y, float W, float Value, float Min, float Max)
{
	Txt(Label, X, Y, KBone, 0.6f);
	const float BX = X + 300.f * U, BW = W, BH = 16.f * U, BY = Y + 8.f * U;
	DrawRect(FLinearColor(0.1f, 0.13f, 0.15f, 1.f), BX, BY, BW, BH);
	const float A = FMath::Clamp((Value - Min) / (Max - Min), 0.f, 1.f);
	DrawRect(KOlive, BX, BY, BW * A, BH);
	DrawRect(KBone, BX + BW * A - 4.f * U, BY - 4.f * U, 8.f * U, BH + 8.f * U);
	Txt(FString::Printf(TEXT("%.2f"), Value), BX + BW + 16.f * U, Y, KDim, 0.6f);
	AddHitBox(FVector2D(BX, BY - 8.f * U), FVector2D(BW, BH + 16.f * U), Id, true, 1);
	Sliders.Add(Id, FSlider{ BX, BY, BW, BH, Min, Max });
}

// ---------------- main drawing function ----------------
void ACRHUD::DrawHUD()
{
	Super::DrawHUD();
	if (!Canvas) return;
	U = Canvas->SizeY / 720.f;
	if (HitT > 0.f) HitT -= GetWorld()->GetDeltaSeconds();
	ACRGameMode* G = GM();
	if (!G) return;
	if (PartyCode.IsEmpty())
	{
		const FString Chars = TEXT("ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
		for (int32 i = 0; i < 6; ++i) PartyCode.AppendChar(Chars[FMath::RandRange(0, Chars.Len() - 1)]);
	}
	switch (G->State)
	{
	case ACRGameMode::EState::Menu: DrawMenu(); break;
	case ACRGameMode::EState::Playing: DrawGame(); break;
	case ACRGameMode::EState::Paused:
		DrawGame();
		DrawOverlay(TEXT("Paused"), TEXT("Esc or the Resume button returns to the game."));
		break;
	case ACRGameMode::EState::Ended:
		DrawGame();
		DrawOverlay(G->EndTitle, G->EndText);
		break;
	}
}

void ACRHUD::DrawMenu()
{
	DrawRect(FLinearColor(0.f, 0.f, 0.f, 0.35f), 0, 0, Canvas->SizeX, Canvas->SizeY);
	switch (Screen)
	{
	case EScreen::Main: DrawMain(); break;
	case EScreen::Play: DrawPlay(); break;
	case EScreen::Multi: DrawMulti(); break;
	case EScreen::Settings: DrawSettings(); break;
	case EScreen::Store: DrawStore(); break;
	}
}

void ACRHUD::DrawMain()
{
	UCRSaveGame* P = Prof();
	Txt(TEXT("CERNY"), 50.f * U, 70.f * U, KBone, 2.6f);
	Txt(TEXT("RAD"), 50.f * U, 150.f * U, KBone, 2.6f);
	Txt(TEXT("Campaign 2015 - version 0.2 (Unreal)"), 54.f * U, 235.f * U, KDim, 0.6f);
	const float Y0 = 290.f * U;
	Btn(TEXT("Play"), 50.f * U, Y0, 300.f * U, 52.f * U, TEXT("main_play"), true, 0.9f);
	Btn(TEXT("Multiplayer"), 50.f * U, Y0 + 62.f * U, 300.f * U, 52.f * U, TEXT("main_multi"), true, 0.9f);
	Btn(TEXT("Settings"), 50.f * U, Y0 + 124.f * U, 300.f * U, 52.f * U, TEXT("main_settings"), true, 0.9f);
	Btn(TEXT("Store"), 50.f * U, Y0 + 186.f * U, 300.f * U, 52.f * U, TEXT("main_store"), true, 0.9f);
	Btn(TEXT("Quit"), 50.f * U, Y0 + 248.f * U, 300.f * U, 52.f * U, TEXT("main_quit"), true, 0.9f);
	if (P)
	{
		const float X = Canvas->SizeX - 290.f * U;
		Panel(X, 24.f * U, 260.f * U, 150.f * U, KPanel);
		Txt(P->PlayerName, X + 14.f * U, 32.f * U, KBone, 0.9f);
		Txt(FString::Printf(TEXT("LVL: %d"), P->GetLevel()), X + 14.f * U, 62.f * U, KDim, 0.55f);
		Txt(FString::Printf(TEXT("Kills: %d"), P->Kills), X + 14.f * U, 86.f * U, KDim, 0.55f);
		Txt(FString::Printf(TEXT("Missions completed: %d"), P->MissionsDone), X + 14.f * U, 110.f * U, KDim, 0.55f);
		Txt(FString::Printf(TEXT("Deaths: %d"), P->Deaths), X + 14.f * U, 134.f * U, KDim, 0.55f);
	}
}

void ACRHUD::Back() { Screen = EScreen::Main; }

void ACRHUD::DrawPlay()
{
	UCRSaveGame* P = Prof();
	UCRGameInstance* GI = GInst();
	Btn(TEXT("Back"), 40.f * U, 30.f * U, 120.f * U, 46.f * U, TEXT("back"));
	Txt(TEXT("Play"), 190.f * U, 28.f * U, KBone, 1.5f);
	if (P) Txt(FString::Printf(TEXT("Weapoints: %d   Medals: %d"), P->Weapoints, P->Medals), Canvas->SizeX - 40.f * U, 40.f * U, KBone, 0.65f, false, true);
	const TArray<FCRCampaignDef>& Camps = CRData::Campaigns();
	for (int32 c = 0; c < Camps.Num(); ++c)
		Btn(FString::Printf(TEXT("Campaign %d: %s"), c + 1, *Camps[c].Title), 40.f * U + c * 330.f * U, 90.f * U, 320.f * U, 42.f * U, FName(*FString::Printf(TEXT("camp_%d"), c)), PlayCampaign != c, 0.6f);
	PlayCampaign = FMath::Clamp(PlayCampaign, 0, Camps.Num() - 1);
	Panel(40.f * U, 140.f * U, Canvas->SizeX - 80.f * U, 74.f * U, KPanel);
	// campaign story (wrapped onto two lines)
	FString Story = Camps[PlayCampaign].Story;
	const int32 Cut = FMath::Min(Story.Len(), 120);
	int32 Split = Story.Len() > Cut ? Cut : Story.Len();
	while (Split > 0 && Split < Story.Len() && Story[Split] != ' ') --Split;
	Txt(Story.Left(Split), 56.f * U, 146.f * U, KDim, 0.5f);
	if (Split < Story.Len())
	{
		FString Rest = Story.RightChop(Split + 1);
		if (Rest.Len() > 130) Rest = Rest.Left(127) + TEXT("...");
		Txt(Rest, 56.f * U, 172.f * U, KDim, 0.5f);
	}
	const int32 N = CRData::CountInCampaign(PlayCampaign);
	for (int32 k = 0; k < N; ++k)
	{
		const int32 G = CRData::GlobalIndex(PlayCampaign, k);
		const FCRLevelDef& L = CRData::Levels()[G];
		const float Y = 228.f * U + k * 142.f * U;
		const bool bOpen = GI && GI->IsUnlocked(G);
		Panel(40.f * U, Y, Canvas->SizeX - 80.f * U, 130.f * U, KPanel);
		Txt(FString::Printf(TEXT("Mission %d: %s"), k + 1, *L.Title), 60.f * U, Y + 6.f * U, bOpen ? KBone : KDim, 0.85f);
		FString Brief = L.Brief;
		if (Brief.Len() > 150) Brief = Brief.Left(147) + TEXT("...");
		Txt(Brief, 60.f * U, Y + 42.f * U, KDim, 0.5f);
		FString Info = FString::Printf(TEXT("Infantry: %d   Mines: %d"), L.Enemies, L.Mines);
		if (L.APCs > 0) Info += FString::Printf(TEXT("   APCs: %d"), L.APCs);
		if (L.Helis > 0) Info += FString::Printf(TEXT("   Helicopters: %d"), L.Helis);
		if (L.Jets > 0) Info += FString::Printf(TEXT("   Jets: %d"), L.Jets);
		Info += FString::Printf(TEXT("   Reward: %d WP, %d medals"), L.RewardWP, L.RewardMedals);
		Txt(Info, 60.f * U, Y + 68.f * U, KDim, 0.5f);
		Btn(bOpen ? TEXT("Start mission") : TEXT("Locked"), 60.f * U, Y + 92.f * U, 220.f * U, 32.f * U, FName(*FString::Printf(TEXT("start_%d"), G)), bOpen, 0.55f);
	}
}

void ACRHUD::DrawMulti()
{
	Btn(TEXT("Back"), 40.f * U, 30.f * U, 120.f * U, 46.f * U, TEXT("back"));
	Txt(TEXT("Multiplayer"), 190.f * U, 28.f * U, KBone, 1.5f);
	Txt(TEXT("Interface mock-up based on the sketch. The online part comes after the campaign."), 40.f * U, 100.f * U, KDim, 0.55f);
	Panel(40.f * U, 140.f * U, 560.f * U, 170.f * U, KPanel);
	Txt(TEXT("Your party code:"), 60.f * U, 150.f * U, KDim, 0.55f);
	Txt(PartyCode, 60.f * U, 176.f * U, KOlive, 1.4f);
	const TCHAR* Modes[5] = { TEXT("1v1"), TEXT("2v2"), TEXT("3v3"), TEXT("4v4"), TEXT("5v5") };
	for (int32 i = 0; i < 5; ++i) Btn(Modes[i], 60.f * U + i * 100.f * U, 250.f * U, 90.f * U, 40.f * U, FName(*FString::Printf(TEXT("mode_%d"), i)), true, 0.6f);
	Panel(40.f * U, 330.f * U, 560.f * U, 130.f * U, KPanel);
	Txt(TEXT("No party yet? Create your own or enter someone elses code."), 60.f * U, 340.f * U, KDim, 0.55f);
	Btn(TEXT("Join"), 60.f * U, 380.f * U, 160.f * U, 44.f * U, TEXT("join"), true, 0.65f);
	Btn(TEXT("Create Party"), 240.f * U, 380.f * U, 220.f * U, 44.f * U, TEXT("create"), true, 0.65f);
	Txt(MultiMsg, 60.f * U, 430.f * U, KRed, 0.55f);
}

void ACRHUD::DrawSettings()
{
	UCRSaveGame* P = Prof();
	Btn(TEXT("Back"), 40.f * U, 30.f * U, 120.f * U, 46.f * U, TEXT("back"));
	Txt(TEXT("Settings"), 190.f * U, 28.f * U, KBone, 1.5f);
	if (!P) return;
	Slider(TEXT("Effects volume"), TEXT("sl_vol"), 60.f * U, 130.f * U, 360.f * U, P->MasterVolume, 0.f, 1.f);
	Slider(TEXT("Mouse sensitivity"), TEXT("sl_sens"), 60.f * U, 190.f * U, 360.f * U, P->MouseSensitivity, 0.2f, 2.5f);
	Slider(TEXT("Field of view (FOV)"), TEXT("sl_fov"), 60.f * U, 250.f * U, 360.f * U, P->FOV, 60.f, 110.f);
	Panel(60.f * U, 320.f * U, 620.f * U, 150.f * U, KPanel);
	Txt(TEXT("Movement: W A S D     Sprint / jump: Shift / Space"), 76.f * U, 330.f * U, KBone, 0.55f);
	Txt(TEXT("Fire / aim: left / right mouse button     Reload: R"), 76.f * U, 360.f * U, KBone, 0.55f);
	Txt(TEXT("Weapons: 1 primary, 2 secondary, 3 knife, 4 grenade     Pause: Esc"), 76.f * U, 390.f * U, KBone, 0.55f);
	Btn(TEXT("Delete progress"), 60.f * U, 500.f * U, 260.f * U, 46.f * U, TEXT("reset"), true, 0.65f);
}

void ACRHUD::DrawStore()
{
	UCRSaveGame* P = Prof();
	Btn(TEXT("Back"), 40.f * U, 30.f * U, 120.f * U, 46.f * U, TEXT("back"));
	Txt(TEXT("Store"), 190.f * U, 28.f * U, KBone, 1.5f);
	if (P) Txt(FString::Printf(TEXT("Weapoints: %d   Medals: %d"), P->Weapoints, P->Medals), Canvas->SizeX - 40.f * U, 40.f * U, KBone, 0.65f, false, true);
	const TCHAR* Tabs[4] = { TEXT("Primary"), TEXT("Secondary"), TEXT("Melee"), TEXT("Grenade") };
	const ECRSlot Slots[4] = { ECRSlot::Primary, ECRSlot::Secondary, ECRSlot::Melee, ECRSlot::Grenade };
	for (int32 i = 0; i < 4; ++i)
	{
		const bool bOn = StoreTab == Slots[i];
		Btn(Tabs[i], 40.f * U + i * 170.f * U, 100.f * U, 160.f * U, 44.f * U, FName(*FString::Printf(TEXT("tab_%d"), i)), !bOn, 0.65f);
	}
	Txt(StoreMsg, 40.f * U, 152.f * U, KRed, 0.55f);
	float Y = 186.f * U;
	for (const FCRWeaponDef& W : CRData::Weapons())
	{
		if (W.Slot != StoreTab) continue;
		const bool bOwned = P && P->OwnedWeapons.Contains(W.Id);
		Panel(40.f * U, Y, Canvas->SizeX - 80.f * U, 46.f * U, KPanel);
		FString Detail = W.Desc;
		Txt(FString::Printf(TEXT("%s   (%s)"), *W.Name, *Detail), 56.f * U, Y + 10.f * U, KBone, 0.6f);
		FString Price = bOwned ? FString(TEXT("Owned")) : (W.Medals > 0 ? FString::Printf(TEXT("%d medals"), W.Medals) : FString::Printf(TEXT("%d Weapoints"), W.Price));
		Txt(Price, Canvas->SizeX - 300.f * U, Y + 10.f * U, KDim, 0.6f, false, true);
		const float BX = Canvas->SizeX - 270.f * U;
		if (!bOwned) Btn(TEXT("Buy"), BX, Y + 5.f * U, 170.f * U, 36.f * U, FName(*FString::Printf(TEXT("buy_%s"), *W.Id.ToString())), true, 0.6f);
		else
		{
			FName Cur;
			switch (W.Slot)
			{
			case ECRSlot::Primary: Cur = P->EquippedPrimary; break;
			case ECRSlot::Secondary: Cur = P->EquippedSecondary; break;
			case ECRSlot::Melee: Cur = P->EquippedMelee; break;
			default: Cur = P->EquippedGrenade; break;
			}
			const bool bCur = Cur == W.Id;
			Btn(bCur ? TEXT("Equipped") : TEXT("Equip"), BX, Y + 5.f * U, 170.f * U, 36.f * U, FName(*FString::Printf(TEXT("eq_%s"), *W.Id.ToString())), !bCur, 0.6f);
		}
		Y += 54.f * U;
	}
}

void ACRHUD::NotifyHitBoxClick(FName BoxName)
{
	ACRGameMode* G = GM();
	UCRGameInstance* GI = GInst();
	UCRSaveGame* P = Prof();
	if (!G || !GI) return;
	const FString N = BoxName.ToString();
	// game overlay
	if (G->State == ACRGameMode::EState::Paused)
	{
		if (N == TEXT("ov_resume")) G->TogglePause();
		else if (N == TEXT("ov_menu")) G->EnterMenu();
		return;
	}
	if (G->State == ACRGameMode::EState::Ended)
	{
		if (N == TEXT("ov_next")) G->NextMission();
		else if (N == TEXT("ov_again")) G->Replay();
		else if (N == TEXT("ov_menu")) G->EnterMenu();
		return;
	}
	if (G->State != ACRGameMode::EState::Menu) return;
	// menu
	if (N == TEXT("main_play")) Screen = EScreen::Play;
	else if (N == TEXT("main_multi")) Screen = EScreen::Multi;
	else if (N == TEXT("main_settings")) Screen = EScreen::Settings;
	else if (N == TEXT("main_store")) Screen = EScreen::Store;
	else if (N == TEXT("main_quit"))
	{
		if (APlayerController* PC = GetOwningPlayerController()) PC->ConsoleCommand(TEXT("quit"));
	}
	else if (N == TEXT("back")) Back();
	else if (N.StartsWith(TEXT("camp_"))) PlayCampaign = FCString::Atoi(*N.RightChop(5));
	else if (N.StartsWith(TEXT("start_"))) G->StartMission(FCString::Atoi(*N.RightChop(6)));
	else if (N == TEXT("join")) MultiMsg = TEXT("Online play is not available yet.");
	else if (N == TEXT("create")) { PartyCode.Empty(); MultiMsg = TEXT("Party created, the new code is at the top."); }
	else if (N.StartsWith(TEXT("tab_")))
	{
		const ECRSlot Slots[4] = { ECRSlot::Primary, ECRSlot::Secondary, ECRSlot::Melee, ECRSlot::Grenade };
		StoreTab = Slots[FMath::Clamp(FCString::Atoi(*N.RightChop(4)), 0, 3)];
		StoreMsg.Empty();
	}
	else if (N.StartsWith(TEXT("buy_")))
	{
		const FName Id(*N.RightChop(4));
		const FCRWeaponDef* W = CRData::GetWeapon(Id);
		if (GI->Buy(Id)) StoreMsg.Empty();
		else if (W && W->Medals > 0) StoreMsg = FString::Printf(TEXT("Not enough medals (%d / %d). You earn them in missions."), P ? P->Medals : 0, W->Medals);
		else if (W) StoreMsg = FString::Printf(TEXT("Not enough Weapoints (%d / %d)."), P ? P->Weapoints : 0, W->Price);
	}
	else if (N.StartsWith(TEXT("eq_"))) GI->Equip(FName(*N.RightChop(3)));
	else if (N == TEXT("reset")) GI->ResetProfile();
	else if (N.StartsWith(TEXT("sl_")) && P)
	{
		if (const FSlider* S = Sliders.Find(BoxName))
		{
			float Mx = 0.f, My = 0.f;
			GetOwningPlayerController()->GetMousePosition(Mx, My);
			const float V = S->Min + FMath::Clamp((Mx - S->X) / S->W, 0.f, 1.f) * (S->Max - S->Min);
			if (N == TEXT("sl_vol")) P->MasterVolume = V;
			else if (N == TEXT("sl_sens")) P->MouseSensitivity = V;
			else if (N == TEXT("sl_fov")) P->FOV = V;
			GI->SaveProfile();
		}
	}
}

// ---------------- game ----------------
void ACRHUD::DrawOverlay(const FString& Title, const FString& Text)
{
	ACRGameMode* G = GM();
	DrawRect(FLinearColor(0.02f, 0.03f, 0.03f, 0.8f), 0, 0, Canvas->SizeX, Canvas->SizeY);
	const float Cx = Canvas->SizeX * 0.5f;
	Txt(Title, Cx, 170.f * U, KBone, 2.2f, true);
	Txt(Text, Cx, 250.f * U, KDim, 0.6f, true);
	float Y = 310.f * U;
	if (G->State == ACRGameMode::EState::Paused)
	{
		Btn(TEXT("Resume"), Cx - 140.f * U, Y, 280.f * U, 52.f * U, TEXT("ov_resume"), true, 0.9f);
		Btn(TEXT("To menu"), Cx - 140.f * U, Y + 64.f * U, 280.f * U, 52.f * U, TEXT("ov_menu"), true, 0.9f);
	}
	else
	{
		if (G->bEndHasNext) { Btn(TEXT("Next mission"), Cx - 140.f * U, Y, 280.f * U, 52.f * U, TEXT("ov_next"), true, 0.9f); Y += 64.f * U; }
		Btn(TEXT("Play again"), Cx - 140.f * U, Y, 280.f * U, 52.f * U, TEXT("ov_again"), true, 0.9f);
		Btn(TEXT("To menu"), Cx - 140.f * U, Y + 64.f * U, 280.f * U, 52.f * U, TEXT("ov_menu"), true, 0.9f);
	}
}

void ACRHUD::DrawMinimap(ACRCharacter* P)
{
	ACRGameMode* G = GM();
	if (!G || !G->World) return;
	const float R = 80.f * U;
	const float Cx = Canvas->SizeX - R - 20.f * U, Cy = R + 20.f * U;
	Disc(Cx, Cy, R, FLinearColor(0.02f, 0.03f, 0.03f, 0.55f));
	const FVector PL = P->GetActorLocation() / 100.f;
	const float Yaw = FMath::DegreesToRadians(P->GetControlRotation().Yaw);
	const FVector2D Fwd(FMath::Cos(Yaw), FMath::Sin(Yaw));
	const FVector2D Rgt(-FMath::Sin(Yaw), FMath::Cos(Yaw));
	const float S = R / 50.f;
	auto Map = [&](const FVector2D& W) { const FVector2D Rel(W.X - PL.X, W.Y - PL.Y); return FVector2D(Cx + FVector2D::DotProduct(Rel, Rgt) * S, Cy - FVector2D::DotProduct(Rel, Fwd) * S); };
	for (const ACRWorldActor::FMapRect& MR : G->World->MapRects)
	{
		const FVector2D C = (MR.Box.Min + MR.Box.Max) * 0.5f;
		if (FVector2D::Distance(C, FVector2D(PL.X, PL.Y)) > 55.f) continue;
		const FVector2D Cn[4] = { Map(MR.Box.Min), Map(FVector2D(MR.Box.Max.X, MR.Box.Min.Y)), Map(MR.Box.Max), Map(FVector2D(MR.Box.Min.X, MR.Box.Max.Y)) };
		for (int32 i = 0; i < 4; ++i) DrawLine(Cn[i].X, Cn[i].Y, Cn[(i + 1) % 4].X, Cn[(i + 1) % 4].Y, FLinearColor(0.7f, 0.72f, 0.65f, 0.9f), 1.5f);
	}
	for (ACREnemy* E : G->Enemies)
	{
		if (!E || !E->bAlive) continue;
		const FVector EL = E->GetActorLocation() / 100.f;
		if (FVector2D::Distance(FVector2D(EL.X, EL.Y), FVector2D(PL.X, PL.Y)) > 50.f) continue;
		const FVector2D M = Map(FVector2D(EL.X, EL.Y));
		Disc(M.X, M.Y, 3.5f * U, FLinearColor(0.85f, 0.25f, 0.16f, 1.f), 10);
	}
	for (ACRVehicle* V : G->Vehicles)
	{
		if (!V || !V->bAlive || !V->CountsForMission()) continue;
		const FVector VL = V->GetActorLocation() / 100.f;
		if (FVector2D::Distance(FVector2D(VL.X, VL.Y), FVector2D(PL.X, PL.Y)) > 60.f) continue;
		const FVector2D M = Map(FVector2D(VL.X, VL.Y));
		DrawRect(FLinearColor(1.f, 0.35f, 0.1f, 1.f), M.X - 5.f * U, M.Y - 5.f * U, 10.f * U, 10.f * U);
	}
	// player (triangle pointing up)
	FCanvasTriangleItem T(FVector2D(Cx, Cy - 9.f * U), FVector2D(Cx + 6.f * U, Cy + 7.f * U), FVector2D(Cx - 6.f * U, Cy + 7.f * U), GWhiteTexture);
	T.SetColor(KBone);
	Canvas->DrawItem(T);
	Ring(Cx, Cy, R - 2.f * U, R, FLinearColor(0.8f, 0.77f, 0.68f, 0.5f), 48);
}

void ACRHUD::DrawGame()
{
	ACRGameMode* G = GM();
	ACRCharacter* P = G ? G->PlayerChar : nullptr;
	if (!G || !P) return;
	const float W = Canvas->SizeX, H = Canvas->SizeY;
	const float Now = GetWorld()->GetTimeSeconds();

	// hit: vignette at low health
	const float Low = FMath::Clamp((60.f - P->Health) / 60.f, 0.f, 1.f);
	if (Low > 0.f)
	{
		const float A = Low * 0.55f;
		const float T = 70.f * U;
		DrawRect(FLinearColor(0.5f, 0.f, 0.f, A), 0, 0, W, T);
		DrawRect(FLinearColor(0.5f, 0.f, 0.f, A), 0, H - T, W, T);
		DrawRect(FLinearColor(0.5f, 0.f, 0.f, A), 0, T, T, H - 2 * T);
		DrawRect(FLinearColor(0.5f, 0.f, 0.f, A), W - T, T, T, H - 2 * T);
	}
	if (G->FlashAlpha > 0.f) DrawRect(FLinearColor(1.f, 1.f, 1.f, FMath::Min(1.f, G->FlashAlpha * 1.3f)), 0, 0, W, H);
	// blood on screen: splats run down and fade
	for (int32 i = Bloods.Num() - 1; i >= 0; --i)
	{
		const FBlood& B = Bloods[i];
		const float Age = Now - B.T0;
		if (Age > 4.5f) { Bloods.RemoveAt(i); continue; }
		const float K = 1.f - Age / 4.5f;
		const float X = B.Pos.X * W, Y = B.Pos.Y * H + Age * 10.f * U;
		const float R = B.R * H;
		Disc(X, Y, R, FLinearColor(0.45f, 0.01f, 0.01f, 0.55f * K), 20);
		Disc(X + R * 0.25f, Y + R * 0.2f, R * 0.6f, FLinearColor(0.35f, 0.0f, 0.0f, 0.5f * K), 16);
		DrawRect(FLinearColor(0.4f, 0.0f, 0.0f, 0.45f * K), X - R * 0.08f, Y, R * 0.16f, R * (1.2f + Age * 0.3f));
	}
	// scope
	if (P->IsScoped())
	{
		const float R = H * 0.46f;
		Ring(W * 0.5f, H * 0.5f, R, W, FLinearColor::Black, 72);
		DrawLine(W * 0.5f - R, H * 0.5f, W * 0.5f + R, H * 0.5f, FLinearColor(0, 0, 0, 0.8f), 1.f);
		DrawLine(W * 0.5f, H * 0.5f - R, W * 0.5f, H * 0.5f + R, FLinearColor(0, 0, 0, 0.8f), 1.f);
	}
	else
	{
		const FLinearColor C = HitT > 0.f ? FLinearColor(1.f, 0.25f, 0.2f, 1.f) : FLinearColor(0.9f, 0.88f, 0.82f, 0.85f);
		DrawLine(W * 0.5f, H * 0.5f - 9.f * U, W * 0.5f, H * 0.5f + 9.f * U, C, 2.f);
		DrawLine(W * 0.5f - 9.f * U, H * 0.5f, W * 0.5f + 9.f * U, H * 0.5f, C, 2.f);
	}
	// health, ammo, objective
	Txt(FString::Printf(TEXT("%d HP"), FMath::Max(0, FMath::CeilToInt(P->Health))), 24.f * U, H - 90.f * U, KBone, 1.6f);
	const FCRWeaponDef* WD = P->CurDef();
	FString Ammo;
	if (WD)
	{
		const bool bGren = WD->Kind == ECRKind::Frag || WD->Kind == ECRKind::Dynamite || WD->Kind == ECRKind::Smoke || WD->Kind == ECRKind::Flash;
		if (WD->Kind == ECRKind::Melee || WD->Kind == ECRKind::Shield) Ammo = TEXT("");
		else if (bGren) Ammo = FString::Printf(TEXT("Count: %d"), P->Nades);
		else if (P->ReloadT > 0.f) Ammo = TEXT("Reloading...");
		else { const ACRCharacter::FAmmo* A = P->Ammo.Find(WD->Id); Ammo = A ? FString::Printf(TEXT("%d / %d"), A->Mag, A->Res) : FString(); }
		Txt(Ammo, W - 24.f * U, H - 110.f * U, KBone, 1.5f, false, true);
		Txt(WD->Name, W - 24.f * U, H - 56.f * U, KDim, 0.65f, false, true);
	}
	const FCRLevelDef& L = CRData::Levels()[FMath::Clamp(G->CurLevel, 0, CRData::Levels().Num() - 1)];
	Panel(20.f * U, 18.f * U, 360.f * U, 62.f * U, FLinearColor(0.04f, 0.06f, 0.07f, 0.6f));
	Txt(FString::Printf(TEXT("Destroy targets: %d / %d"), G->Killed, G->TotalEnemies), 30.f * U, 22.f * U, KBone, 0.75f);
	Txt(FString::Printf(TEXT("%s - mission %d: %s"), *CRData::Campaigns()[L.Campaign].Title, CRData::IndexInCampaign(G->CurLevel) + 1, *L.Title), 30.f * U, 52.f * U, KDim, 0.5f);
	if (!G->Msg.IsEmpty()) Txt(G->Msg, W * 0.5f, H * 0.22f, KBone, 0.95f, true);
	if (G->NearMineM >= 0.f) Txt(FString::Printf(TEXT("Mine nearby! (%d m)"), (int32)G->NearMineM), W * 0.5f, H * 0.32f, KRed, 0.9f, true);
	DrawMinimap(P);
}
