#pragma once
#include "CoreMinimal.h"

enum class ECRSlot : uint8 { Primary, Secondary, Melee, Grenade };

/** Weapon kind = how it behaves when "fired". */
enum class ECRKind : uint8 { Hitscan, Melee, Rocket, Arrow, Napalm, Stun, Frag, Dynamite, Smoke, Flash, Shield };

/** Weapon (data). */
struct FCRWeaponDef
{
	FName Id;
	FString Name;
	ECRSlot Slot = ECRSlot::Primary;
	ECRKind Kind = ECRKind::Hitscan;
	float Damage = 24.f;
	int32 Pellets = 1;
	float Rate = 0.1f;
	int32 Mag = 30;
	int32 Reserve = 150;
	bool bAuto = true;
	float SpreadDeg = 0.6f;
	int32 Price = 0;
	int32 Medals = 0;
	float Zoom = 1.3f;
	bool bScoped = false;
	float ReloadTime = 1.6f;
	bool bBayonet = false;
	FString Desc;
};

struct FCRCampaignDef
{
	FString Title;
	FString Story;
};

/** Mission (data). */
struct FCRLevelDef
{
	int32 Campaign = 0;
	FString Title;
	FString Brief;
	int32 Enemies = 12;   // infantry
	int32 APCs = 0;       // armored personnel carriers
	int32 Helis = 0;      // helicopters
	int32 Jets = 0;       // jets (not counted toward the mission goal)
	int32 Mines = 8;
	int32 Kits = 3;
	int32 Houses = 10;
	int32 Ruins = 2;
	int32 Seed = 11;
	int32 RewardWP = 150;
	int32 RewardMedals = 20;
	int32 RewardXP = 60;
	float EnemyAcc = 0.5f;
	float EnemyHP = 60.f;
	bool bDesert = false;
	bool bRunway = false;
	FLinearColor Grass, Dirt, Road, Rock, Rock2;
	FVector SunDir = FVector(0.5f, 0.3f, 0.7f); // direction TOWARD the sun
	float SunIntensity = 8.f;
	FLinearColor SunColor = FLinearColor::White;
	float FogDensity = 0.004f;
};

namespace CRData
{
	const TArray<FCRWeaponDef>& Weapons();
	const FCRWeaponDef* GetWeapon(FName Id);
	const TArray<FCRLevelDef>& Levels();
	const TArray<FCRCampaignDef>& Campaigns();
	/** Order of the mission within its campaign. */
	int32 IndexInCampaign(int32 GlobalIdx);
	/** Global index of mission K in campaign C, or -1. */
	int32 GlobalIndex(int32 Campaign, int32 K);
	int32 CountInCampaign(int32 Campaign);
	/** Next mission in the same campaign, or -1. */
	int32 NextInCampaign(int32 GlobalIdx);
}
