#pragma once
#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "CRGameInstance.generated.h"

class UCRSaveGame;

UCLASS()
class CERNYRAD_API UCRGameInstance : public UGameInstance
{
	GENERATED_BODY()
public:
	virtual void Init() override;

	UPROPERTY() UCRSaveGame* Profile = nullptr;
	int32 CurrentLevel = 0;

	void LoadProfile();
	void SaveProfile();
	void ResetProfile();
	bool Buy(FName Id);
	void Equip(FName Id);
	/** Is the mission (global index) unlocked? */
	bool IsUnlocked(int32 GlobalIdx) const;

	static constexpr const TCHAR* SaveSlot = TEXT("CernyRadProfile");
};
