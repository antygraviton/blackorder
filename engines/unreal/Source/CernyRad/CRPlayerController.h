#pragma once
#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "CRPlayerController.generated.h"

UCLASS()
class CERNYRAD_API ACRPlayerController : public APlayerController
{
	GENERATED_BODY()
public:
	ACRPlayerController();
	/** true = menu (cursor, clicking), false = game (the mouse controls the camera). */
	void SetMenuInput(bool bMenu);

protected:
	virtual void SetupInputComponent() override;
	void OnPausePressed();
};
