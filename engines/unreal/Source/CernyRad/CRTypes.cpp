#include "CRTypes.h"
#include "CRUtil.h"

namespace CRData
{
	static FCRWeaponDef W(const TCHAR* Id, const TCHAR* Name, ECRSlot Slot, ECRKind Kind, float Dmg, int32 Pellets, float Rate, int32 Mag, int32 Res, bool bAuto, float Spread, int32 Price, int32 Medals, float Zoom, bool bScoped, float Reload, const TCHAR* Desc)
	{
		FCRWeaponDef D;
		D.Id = Id; D.Name = Name; D.Slot = Slot; D.Kind = Kind; D.Damage = Dmg; D.Pellets = Pellets; D.Rate = Rate; D.Mag = Mag; D.Reserve = Res;
		D.bAuto = bAuto; D.SpreadDeg = Spread; D.Price = Price; D.Medals = Medals; D.Zoom = Zoom; D.bScoped = bScoped; D.ReloadTime = Reload; D.Desc = Desc;
		return D;
	}

	const TArray<FCRWeaponDef>& Weapons()
	{
		static TArray<FCRWeaponDef> L;
		if (L.Num() == 0)
		{
			const ECRKind H = ECRKind::Hitscan;
			// primary
			L.Add(W(TEXT("hk416"), TEXT("HK416 (desert)"), ECRSlot::Primary, H, 24, 1, 0.085f, 30, 150, true, 0.6f, 0, 0, 1.3f, false, 1.6f, TEXT("Assault rifle")));
			L.Add(W(TEXT("ak"), TEXT("AK-74M"), ECRSlot::Primary, H, 27, 1, 0.1f, 30, 150, true, 0.8f, 0, 0, 1.2f, false, 1.6f, TEXT("Assault rifle")));
			L.Add(W(TEXT("mp5"), TEXT("MP5 submachine gun"), ECRSlot::Primary, H, 19, 1, 0.07f, 30, 180, true, 1.2f, 80, 0, 1.15f, false, 1.6f, TEXT("Fast submachine gun")));
			L.Add(W(TEXT("shotgun"), TEXT("Remington 870"), ECRSlot::Primary, H, 15, 8, 0.85f, 6, 36, false, 2.6f, 120, 0, 1.1f, false, 2.2f, TEXT("Shotgun")));
			L.Add(W(TEXT("svd"), TEXT("SVD sniper rifle"), ECRSlot::Primary, H, 95, 1, 0.9f, 10, 40, false, 0.1f, 0, 50, 3.2f, true, 1.6f, TEXT("Scope, powerful hit")));
			L.Add(W(TEXT("rpg"), TEXT("RPG-7"), ECRSlot::Primary, ECRKind::Rocket, 220, 1, 1.2f, 1, 5, false, 0.3f, 250, 0, 1.4f, false, 3.0f, TEXT("Rocket, 8 m blast. Destroys armor")));
			L.Add(W(TEXT("bow"), TEXT("Luk"), ECRSlot::Primary, ECRKind::Arrow, 85, 1, 0.9f, 1, 14, false, 0.2f, 150, 0, 1.6f, false, 1.0f, TEXT("Silent, the arrow flies in an arc")));
			{
				FCRWeaponDef B = W(TEXT("bayonet"), TEXT("Bayonet rifle"), ECRSlot::Primary, H, 25, 1, 0.1f, 30, 150, true, 0.9f, 90, 0, 1.2f, false, 1.6f, TEXT("Stabs with the bayonet at close range"));
				B.bBayonet = true;
				L.Add(B);
			}
			// secondary
			L.Add(W(TEXT("glock"), TEXT("Glock 17"), ECRSlot::Secondary, H, 22, 1, 0.2f, 17, 85, false, 1.2f, 0, 0, 1.1f, false, 1.6f, TEXT("Pistol")));
			L.Add(W(TEXT("revolver"), TEXT("Colt Python"), ECRSlot::Secondary, H, 62, 1, 0.6f, 6, 36, false, 0.25f, 60, 0, 1.1f, false, 2.4f, TEXT("Powerful revolver")));
			L.Add(W(TEXT("dpistol"), TEXT("Dual pistols"), ECRSlot::Secondary, H, 17, 1, 0.1f, 34, 170, true, 2.4f, 70, 0, 1.05f, false, 2.2f, TEXT("Rapid fire, large spread")));
			L.Add(W(TEXT("napalm"), TEXT("Napalm"), ECRSlot::Secondary, ECRKind::Napalm, 14, 1, 1.5f, 2, 6, false, 0.5f, 140, 0, 1.1f, false, 2.4f, TEXT("Sets the ground on fire for 6 s, damages over time")));
			L.Add(W(TEXT("hardbass"), TEXT("Hardbass"), ECRSlot::Secondary, ECRKind::Stun, 8, 1, 0.8f, 12, 48, false, 0.f, 110, 0, 1.1f, false, 1.8f, TEXT("Bass wave stuns enemies in front of you")));
			// melee
			L.Add(W(TEXT("knife"), TEXT("Combat knife"), ECRSlot::Melee, ECRKind::Melee, 70, 1, 0.45f, 0, 0, false, 0.f, 0, 0, 1.f, false, 0.f, TEXT("Fast and silent")));
			L.Add(W(TEXT("machete"), TEXT("Machete"), ECRSlot::Melee, ECRKind::Melee, 55, 1, 0.28f, 0, 0, false, 0.f, 40, 0, 1.f, false, 0.f, TEXT("Very fast")));
			L.Add(W(TEXT("hammer"), TEXT("Hammer"), ECRSlot::Melee, ECRKind::Melee, 115, 1, 0.95f, 0, 0, false, 0.f, 60, 0, 1.f, false, 0.f, TEXT("Slow, crushes anyone")));
			L.Add(W(TEXT("crossbow"), TEXT("Crossbow"), ECRSlot::Melee, ECRKind::Arrow, 75, 1, 1.1f, 1, 12, false, 0.1f, 130, 0, 1.5f, false, 1.8f, TEXT("Silent long-range bolt")));
			L.Add(W(TEXT("shield"), TEXT("Riot shield"), ECRSlot::Melee, ECRKind::Shield, 25, 1, 0.8f, 0, 0, false, 0.f, 100, 0, 1.f, false, 0.f, TEXT("Blocks bullets from the front, bash stuns")));
			// grenades
			L.Add(W(TEXT("m67"), TEXT("M67 grenade"), ECRSlot::Grenade, ECRKind::Frag, 130, 1, 1.0f, 0, 0, false, 0.f, 0, 0, 1.f, false, 0.f, TEXT("7 m blast")));
			L.Add(W(TEXT("dynamite"), TEXT("Dynamite"), ECRSlot::Grenade, ECRKind::Dynamite, 190, 1, 1.0f, 0, 0, false, 0.f, 50, 0, 1.f, false, 0.f, TEXT("Bigger 9 m blast, longer fuse")));
			L.Add(W(TEXT("smoke"), TEXT("Smoke grenade"), ECRSlot::Grenade, ECRKind::Smoke, 0, 1, 1.0f, 0, 0, false, 0.f, 40, 0, 1.f, false, 0.f, TEXT("Smoke blocks the enemy line of sight")));
			L.Add(W(TEXT("flash"), TEXT("Flashbang"), ECRSlot::Grenade, ECRKind::Flash, 0, 1, 1.0f, 0, 0, false, 0.f, 50, 0, 1.f, false, 0.f, TEXT("Stuns everyone within 15 m")));
		}
		return L;
	}

	const FCRWeaponDef* GetWeapon(FName Id)
	{
		for (const FCRWeaponDef& D : Weapons())
			if (D.Id == Id) return &D;
		return nullptr;
	}

	const TArray<FCRCampaignDef>& Campaigns()
	{
		static TArray<FCRCampaignDef> C;
		if (C.Num() == 0)
		{
			FCRCampaignDef A;
			A.Title = TEXT("Black Order");
			A.Story = TEXT("The year is 2015. A secret organization descended from Nazi structures emerges from its mountain bases. As a special-forces soldier you investigate a vanished village and uncover the army of the Black Order.");
			C.Add(A);
			FCRCampaignDef B;
			B.Title = TEXT("Steel Fist");
			B.Story = TEXT("After the mountain base falls, the Order deploys its mechanized division. Armored personnel carriers, helicopters and jets roll toward the border region. Your team has to stop them before they reach the town. Ordinary bullets are not enough against armor - use the RPG (key 5), grenades or napalm.");
			C.Add(B);
		}
		return C;
	}

	const TArray<FCRLevelDef>& Levels()
	{
		static TArray<FCRLevelDef> L;
		if (L.Num() == 0)
		{
			// ---------- campaign 1: Black Order (infantry) ----------
			FCRLevelDef A;
			A.Campaign = 0;
			A.Title = TEXT("The Vanished Village");
			A.Brief = TEXT("The year is 2015. A mountain village has stopped broadcasting. Investigate it.");
			A.Enemies = 12; A.Mines = 8; A.Kits = 3; A.Houses = 10; A.Ruins = 2; A.Seed = 11;
			A.RewardWP = 150; A.RewardMedals = 20; A.RewardXP = 60; A.EnemyAcc = 0.5f; A.EnemyHP = 60.f;
			A.Grass = CRCol(95, 125, 58); A.Dirt = CRCol(125, 109, 76); A.Road = CRCol(110, 96, 72); A.Rock = CRCol(127, 123, 114); A.Rock2 = CRCol(163, 157, 146);
			A.SunDir = FVector(0.55f, 0.35f, 0.7f); A.SunIntensity = 9.f; A.SunColor = CRCol(255, 242, 214); A.FogDensity = 0.0025f;
			L.Add(A);

			FCRLevelDef B;
			B.Campaign = 0;
			B.Title = TEXT("Base Infiltration");
			B.Brief = TEXT("An encrypted map leads to an abandoned mine. The Order has taken it over.");
			B.Enemies = 18; B.Mines = 14; B.Kits = 3; B.Houses = 13; B.Ruins = 4; B.Seed = 23;
			B.RewardWP = 250; B.RewardMedals = 30; B.RewardXP = 90; B.EnemyAcc = 0.6f; B.EnemyHP = 70.f;
			B.Grass = CRCol(125, 125, 74); B.Dirt = CRCol(146, 127, 90); B.Road = CRCol(122, 108, 85); B.Rock = CRCol(143, 138, 128); B.Rock2 = CRCol(188, 178, 156);
			B.SunDir = FVector(0.4f, 0.5f, 0.55f); B.SunIntensity = 5.f; B.SunColor = CRCol(232, 226, 212); B.FogDensity = 0.004f;
			L.Add(B);

			FCRLevelDef C;
			C.Campaign = 0;
			C.Title = TEXT("City Under Fire");
			C.Brief = TEXT("The Order holds a small town on the border. Evening, fog, mines in the streets.");
			C.Enemies = 24; C.Mines = 20; C.Kits = 4; C.Houses = 15; C.Ruins = 8; C.Seed = 37;
			C.RewardWP = 400; C.RewardMedals = 40; C.RewardXP = 120; C.EnemyAcc = 0.7f; C.EnemyHP = 80.f;
			C.Grass = CRCol(85, 92, 58); C.Dirt = CRCol(98, 80, 60); C.Road = CRCol(72, 65, 58); C.Rock = CRCol(102, 96, 90); C.Rock2 = CRCol(133, 112, 92);
			C.SunDir = FVector(-0.75f, 0.45f, 0.18f); C.SunIntensity = 8.f; C.SunColor = CRCol(255, 154, 85); C.FogDensity = 0.006f;
			L.Add(C);

			// ---------- campaign 2: Steel Fist (vehicles) ----------
			FCRLevelDef D;
			D.Campaign = 1;
			D.Title = TEXT("Convoy");
			D.Brief = TEXT("An Order armored convoy is driving through the desert toward the border town. Destroy the APCs. Bullets are not enough: RPG (key 5), grenades, napalm.");
			D.Enemies = 6; D.APCs = 3; D.Helis = 0; D.Jets = 0; D.Mines = 6; D.Kits = 4; D.Houses = 3; D.Ruins = 2; D.Seed = 51; D.bDesert = true;
			D.RewardWP = 300; D.RewardMedals = 30; D.RewardXP = 100; D.EnemyAcc = 0.5f; D.EnemyHP = 60.f;
			D.Grass = CRCol(176, 156, 108); D.Dirt = CRCol(196, 170, 120); D.Road = CRCol(150, 128, 96); D.Rock = CRCol(150, 128, 104); D.Rock2 = CRCol(190, 164, 130);
			D.SunDir = FVector(0.3f, 0.2f, 0.9f); D.SunIntensity = 11.f; D.SunColor = CRCol(255, 246, 226); D.FogDensity = 0.0015f;
			L.Add(D);

			FCRLevelDef E;
			E.Campaign = 1;
			E.Title = TEXT("Airfield");
			E.Brief = TEXT("The Order has taken over a military airfield. Destroy the helicopters and APCs. Beware of jet strikes - they bomb the spot where you stand.");
			E.Enemies = 8; E.APCs = 2; E.Helis = 2; E.Jets = 1; E.Mines = 6; E.Kits = 4; E.Houses = 5; E.Ruins = 1; E.Seed = 63; E.bDesert = true; E.bRunway = true;
			E.RewardWP = 450; E.RewardMedals = 40; E.RewardXP = 140; E.EnemyAcc = 0.55f; E.EnemyHP = 70.f;
			E.Grass = CRCol(150, 138, 108); E.Dirt = CRCol(168, 150, 116); E.Road = CRCol(120, 108, 90); E.Rock = CRCol(128, 118, 104); E.Rock2 = CRCol(166, 152, 130);
			E.SunDir = FVector(0.5f, -0.3f, 0.5f); E.SunIntensity = 6.f; E.SunColor = CRCol(240, 226, 204); E.FogDensity = 0.003f;
			L.Add(E);

			FCRLevelDef F;
			F.Campaign = 1;
			F.Title = TEXT("Steel Fist");
			F.Brief = TEXT("The division command post. Armor, helicopters and jets all at once. When the last machine falls, the Order loses its strength on the border.");
			F.Enemies = 8; F.APCs = 4; F.Helis = 3; F.Jets = 2; F.Mines = 8; F.Kits = 5; F.Houses = 5; F.Ruins = 3; F.Seed = 77; F.bDesert = true;
			F.RewardWP = 650; F.RewardMedals = 60; F.RewardXP = 200; F.EnemyAcc = 0.6f; F.EnemyHP = 80.f;
			F.Grass = CRCol(150, 118, 84); F.Dirt = CRCol(170, 128, 90); F.Road = CRCol(110, 86, 66); F.Rock = CRCol(120, 96, 78); F.Rock2 = CRCol(160, 120, 92);
			F.SunDir = FVector(-0.8f, 0.3f, 0.15f); F.SunIntensity = 9.f; F.SunColor = CRCol(255, 140, 70); F.FogDensity = 0.004f;
			L.Add(F);
		}
		return L;
	}

	int32 IndexInCampaign(int32 G)
	{
		const TArray<FCRLevelDef>& L = Levels();
		if (!L.IsValidIndex(G)) return 0;
		int32 K = 0;
		for (int32 i = 0; i < G; ++i) if (L[i].Campaign == L[G].Campaign) ++K;
		return K;
	}

	int32 GlobalIndex(int32 Campaign, int32 K)
	{
		const TArray<FCRLevelDef>& L = Levels();
		int32 N = 0;
		for (int32 i = 0; i < L.Num(); ++i)
		{
			if (L[i].Campaign != Campaign) continue;
			if (N == K) return i;
			++N;
		}
		return -1;
	}

	int32 CountInCampaign(int32 Campaign)
	{
		int32 N = 0;
		for (const FCRLevelDef& D : Levels()) if (D.Campaign == Campaign) ++N;
		return N;
	}

	int32 NextInCampaign(int32 G)
	{
		const TArray<FCRLevelDef>& L = Levels();
		if (!L.IsValidIndex(G)) return -1;
		return GlobalIndex(L[G].Campaign, IndexInCampaign(G) + 1);
	}
}
