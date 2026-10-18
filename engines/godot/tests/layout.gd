extends SceneTree
func _initialize():
	call_deferred("_r")
func _r():
	root.size = Vector2(1280, 720)
	var menu = load("res://scenes/menu.tscn").instantiate()
	root.add_child(menu)
	await process_frame
	await process_frame
	print("menu rect ", menu.get_global_rect())
	var main = menu.screens["main"]
	for c in main.get_children():
		print(" main child ", c.get_class(), " ", c.get_global_rect())
	var pb = main.get_child(1)
	print("player box ", pb.get_global_rect())
	menu.queue_free()
	await process_frame
	var game = root.get_node("Game")
	game.current_level = 0
	var m = load("res://scenes/mission.tscn").instantiate()
	root.add_child(m)
	await process_frame
	await process_frame
	for n in ["hp_l", "ammo_l", "obj_l", "msg_l", "warn_l", "minimap"]:
		print(n, " ", m.hud.get(n).get_global_rect())
	quit()
