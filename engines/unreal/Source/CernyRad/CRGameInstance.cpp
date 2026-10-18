#include "CRGameInstance.h"
#include "CRSaveGame.h"
#include "CRTypes.h"
#include "Kismet/GameplayStatics.h"

void UCRGameInstance::Init()
{
	Super::Init();
	LoadProfile();
}

void UCRGameInstance::LoadProfile()
{
	Profile = nullptr;
	if (UGameplayStatics::DoesSaveGameExist(SaveSlot, 0))
		Profile = Cast<UCRSaveGame>(UGameplayStatics::LoadGameFromSlot(SaveSlot, 0));
	if (!Profile)
	{
		Profile = Cast<UCRSaveGame>(UGameplayStatics::CreateSaveGameObject(UCRSaveGame::StaticClass()));
		Profile->OwnedWeapons.Add(FName(TEXT("hk416")));
		Profile->OwnedWeapons.Add(FName(TEXT("ak")));
		Profile->OwnedWeapons.Add(FName(TEXT("glock")));
		Profile->OwnedWeapons.Add(FName(TEXT("knife")));
		Profile->OwnedWeapons.Add(FName(TEXT("m67")));
		SaveProfile();
	}
}

void UCRGameInstance::SaveProfile()
{
	if (Profile) UGameplayStatics::SaveGameToSlot(Profile, SaveSlot, 0);
}

void UCRGameInstance::ResetProfile()
{
	UGameplayStatics::DeleteGameInSlot(SaveSlot, 0);
	LoadProfile();
}

bool UCRGameInstance::Buy(FName Id)
{
	const FCRWeaponDef* W = CRData::GetWeapon(Id);
	if (!Profile || !W || Profile->OwnedWeapons.Contains(Id)) return false;
	if (W->Medals > 0)
	{
		if (Profile->Medals < W->Medals) return false;
		Profile->Medals -= W->Medals;
	}
	else
	{
		if (Profile->Weapoints < W->Price) return false;
		Profile->Weapoints -= W->Price;
	}
	Profile->OwnedWeapons.Add(Id);
	SaveProfile();
	return true;
}

void UCRGameInstance::Equip(FName Id)
{
	const FCRWeaponDef* W = CRData::GetWeapon(Id);
	if (!Profile || !W || !Profile->OwnedWeapons.Contains(Id)) return;
	if (W->Slot == ECRSlot::Primary) Profile->EquippedPrimary = Id;
	else if (W->Slot == ECRSlot::Secondary) Profile->EquippedSecondary = Id;
	else if (W->Slot == ECRSlot::Melee) Profile->EquippedMelee = Id;
	else if (W->Slot == ECRSlot::Grenade) Profile->EquippedGrenade = Id;
	SaveProfile();
}

bool UCRGameInstance::IsUnlocked(int32 GlobalIdx) const
{
	if (!Profile || !CRData::Levels().IsValidIndex(GlobalIdx)) return false;
	const int32 C = CRData::Levels()[GlobalIdx].Campaign;
	return CRData::IndexInCampaign(GlobalIdx) <= Profile->GetMax(C);
}
