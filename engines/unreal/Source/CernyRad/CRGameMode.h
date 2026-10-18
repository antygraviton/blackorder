#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "CRTypes.h"
#include "CRUtil.h"
#include "CRGameMode.generated.h"

class ACRCharacter;
class ACREnemy;
class ACRVehicle;
class ACRWorldActor;
class ACRPropActor;
class ACRHUD;
class ACRPlayerController;
class UStaticMeshComponent;
class UCRGameInstance;
class ACameraActor;

/**
 * Game rules and states: menu, mission, pause, mission end. The whole environment, characters, vehicles and menu are created in code,
 * so the game runs in any map (/Engine/Maps/Entry is enough).
 */
UCLASS()
class CERNYRAD_API ACRGameMode : public AGameModeBase
{
	GENERATED_BODY()
public:
	ACRGameMode();

	enum class EState : uint8 { Menu, Playing, Paused, Ended };
	EState State = EState::Menu;
	bool IsFrozen() const { return State != EState::Playing; }

	UPROPERTY() ACRCharacter* PlayerChar = nullptr;
	UPROPERTY() ACRWorldActor* World = nullptr;
	UPROPERTY() TArray<ACREnemy*> Enemies;
	UPROPERTY() TArray<ACRVehicle*> Vehicles;

	// mission state (read by the HUD)
	int32 Killed = 0;
	int32 TotalEnemies = 0;
	int32 CurLevel = 0; // global mission index
	FString EndTitle;
	FString EndText;
	bool bEndHasNext = false;
	float NearMineM = -1.f;
	float FlashAlpha = 0.f;
	FString Msg;
	float MsgT = 0.f;

	// game flow
	void EnterMenu();
	void StartMission(int32 GlobalIndex);
	void Replay();
	void NextMission();
	void TogglePause();

	// events
	void OnEnemyKilled(ACREnemy* E);
	void OnVehicleKilled(ACRVehicle* V);
	void OnPlayerDied();
	void SpawnGrenade(const FVector& LocCm, const FVector& VelCm, const FCRWeaponDef& W);
	void SpawnRocket(const FVector& LocCm, const FVector& Dir, bool bNapalm, const FCRWeaponDef& W);
	void SpawnArrow(const FVector& LocCm, const FVector& Dir, const FCRWeaponDef& W);
	void Explode(const FVector& LocCm, float RadiusM, float Damage);
	void SpawnFire(const FVector& LocCm, float Dps);
	void FireDamage(const FVector& LocCm, float RadiusM, float Dmg);
	void AddSmoke(const FVector& LocCm, float RadiusM, float Secs);
	void Flash(const FVector& LocCm, float RadiusM, float Secs);
	void StunCone(const FVector& LocCm, const FVector& Dir, float RangeM, float HalfDeg, float Secs, float Dmg);
	bool IsSmokeBlocking(const FVector& From, const FVector& To) const;
	void NotifyAlert(const FVector& LocCm, float RadiusM);
	void PlaySfx(ECRSfx Kind, float Vol);
	void AddBlood(float Dmg);
	void HitMarker();
	void Say(const FString& T, float Secs) { Msg = T; MsgT = Secs; }

	UCRGameInstance* GI() const;
	ACRHUD* GetHUD2() const;
	ACRPlayerController* GetPC() const;

protected:
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	struct FMine { TWeakObjectPtr<ACRPropActor> Actor; UStaticMeshComponent* Led = nullptr; FVector Loc; bool bLive = true; };
	struct FKit { TWeakObjectPtr<ACRPropActor> Actor; FVector Loc; bool bUsed = false; };
	struct FSmoke { FVector Loc; float RadiusCm; double EndT; };
	TArray<FMine> Mines;
	TArray<FKit> Kits;
	TArray<FSmoke> Smokes;
	UPROPERTY() TArray<AActor*> EnvActors;
	UPROPERTY() ACameraActor* MenuCam = nullptr;
	float MenuAngle = 0.f;
	float LastBeep = 0.f;
	FTimerHandle EndTimer;

	void ClearAll();
	void BuildEnvironment(int32 Level);
	void BuildWorld(int32 Level);
	void SpawnEntities();
	void TickMines(float Dt);
	void Finish(bool bWin);
	void CheckWin();
};
