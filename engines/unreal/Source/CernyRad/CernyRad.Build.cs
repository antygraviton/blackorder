using UnrealBuildTool;

public class CernyRad : ModuleRules
{
	public CernyRad(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		PublicDependencyModuleNames.AddRange(new string[] {
			"Core", "CoreUObject", "Engine", "InputCore", "AIModule", "ProceduralMeshComponent", "RenderCore"
		});
	}
}
