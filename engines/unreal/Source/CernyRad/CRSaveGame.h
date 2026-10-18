#pragma once
#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "CRSaveGame.generated.h"

/** Player progress: currencies, unlocked weapons, highest unlocked mission, settings. */
UCLASS()
class CERNYRAD_API UCRSaveGame : public USaveGame
{
	GENERATED_BODY()
public:
	UPROPERTY() FString PlayerName = TEXT("PLAYER");
	UPROPERTY() int32 XP = 0;
	UPROPERTY() int32 Weapoints = 0;
	UPROPERTY() int32 Medals = 0;
	UPROPERTY() int32 Kills = 0;
	UPROPERTY() int32 MissionsDone = 0;
	UPROPERTY() int32 Deaths = 0;
	UPROPERTY() int32 MaxLevel = 0;   // highest unlocked mission in campaign 1
	UPROPERTY() int32 MaxLevel2 = 0;  // highest unlocked mission in campaign 2
	UPROPERTY() TSet<FName> OwnedWeapons;
	UPROPERTY() FName EquippedPrimary = TEXT("hk416");
	UPROPERTY() FName EquippedSecondary = TEXT("glock");
	UPROPERTY() FName EquippedMelee = TEXT("knife");
	UPROPERTY() FName EquippedGrenade = TEXT("m67");
	UPROPERTY() float MouseSensitivity = 1.f;
	UPROPERTY() float MasterVolume = 0.6f;
	UPROPERTY() float FOV = 80.f;

	int32 GetLevel() const { return 1 + XP / 100; }
	int32 GetMax(int32 Campaign) const { return Campaign == 0 ? MaxLevel : MaxLevel2; }
	void SetMax(int32 Campaign, int32 V) { if (Campaign == 0) MaxLevel = V; else MaxLevel2 = V; }
};
