extends SceneTree
# Run: godot --headless --path . -s res://tests/smoke.gd

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var game = root.get_node("Game")
	# menu
	var menu = load("res://scenes/menu.tscn").instantiate()
	root.add_child(menu)
	await process_frame
	for s in ["play", "multi", "settings", "store", "main"]:
		menu.show_screen(s)
		await process_frame
	game.S.wp = 500
	menu._buy("mp5")
	menu._equip("mp5")
	menu._equip("hk416")
	print("MENU OK, owned: ", game.S.owned.keys())
	menu.queue_free()
	await process_frame
	for lv in 3:
		game.current_level = lv
		var t0 := Time.get_ticks_msec()
		var m = load("res://scenes/mission.tscn").instantiate()
		root.add_child(m)
		await process_frame
		print("level ", lv, " built in ", Time.get_ticks_msec() - t0, " ms, enemies ", m.enemies.size(), " mines ", m.mines.size(), " nodes ", root.get_child_count())
		var p = m.player
		for i in 30:
			await physics_frame
		Input.action_press("move_forward")
		for i in 30:
			await physics_frame
		for slot in 4:
			p.equip(slot)
			p.fire(true)
			await physics_frame
		p.equip(0)
		for i in 15:
			p.fire(true)
			p.last_shot = -10.0
			await physics_frame
		p.reload()
		for i in 120:
			await physics_frame
		p.equip(3)
		p.fire(true)
		for i in 150:
			await physics_frame
		for e in m.enemies:
			e.alerted = true
		for i in 200:
			await physics_frame
		# death of one enemy and a hit on the player
		var e0 = m.enemies[0]
		e0.take_damage(999.0, true, e0.global_position + Vector3(0, 1.5, 0))
		p.hurt(20.0)
		for i in 30:
			await physics_frame
		for e in m.enemies:
			if e.alive:
				e.take_damage(9999.0, false, e.global_position + Vector3.UP)
		for i in 60:
			await physics_frame
		print("level ", lv, " killed ", m.killed, "/", m.total, " hp ", p.hp, " over ", m.over)
		Input.action_release("move_forward")
		m.queue_free()
		await process_frame
	print("ALL OK")
	quit()
