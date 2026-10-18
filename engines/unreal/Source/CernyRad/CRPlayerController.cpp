#include "CRPlayerController.h"
#include "CRGameMode.h"
#include "Components/InputComponent.h"
#include "Engine/World.h"

ACRPlayerController::ACRPlayerController()
{
	bShowMouseCursor = true;
	bEnableClickEvents = true;
	bEnableMouseOverEvents = true;
}

void ACRPlayerController::SetupInputComponent()
{
	Super::SetupInputComponent();
	if (InputComponent)
	{
		FInputActionBinding& B = InputComponent->BindAction("Pause", IE_Pressed, this, &ACRPlayerController::OnPausePressed);
		B.bExecuteWhenPaused = true;
	}
}

void ACRPlayerController::OnPausePressed()
{
	if (ACRGameMode* GM = GetWorld()->GetAuthGameMode<ACRGameMode>())
		GM->TogglePause();
}

void ACRPlayerController::SetMenuInput(bool bMenu)
{
	bShowMouseCursor = bMenu;
	if (bMenu)
	{
		FInputModeGameAndUI M;
		M.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
		M.SetHideCursorDuringCapture(false);
		SetInputMode(M);
	}
	else
	{
		FInputModeGameOnly M;
		SetInputMode(M);
	}
}
