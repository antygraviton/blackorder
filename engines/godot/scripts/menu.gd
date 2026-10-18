extends Control
## Main menu following the sketch: Play, Multiplayer, Settings, Store, Quit.
## The whole UI is assembled in code, so nothing needs to be clicked together in the editor.

var screens := {}
var player_name_l: Label
var player_stats_l: Label
var wallet_labels: Array = []
var play_box: VBoxContainer
var store_tabs: TabContainer
var store_msg: Label
var _theme := Theme.new()

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().paused = false
	_build_theme()
	theme = _theme
	_background()
	screens["main"] = _main_screen()
	screens["play"] = _play_screen()
	screens["multi"] = _multi_screen()
	screens["settings"] = _settings_screen()
	screens["store"] = _store_screen()
	for k in screens:
		add_child(screens[k])
	show_screen("main")

func _build_theme() -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.11, 0.15, 0.17, 0.9)
	normal.border_color = Color(0.16, 0.21, 0.24)
	normal.set_border_width_all(1)
	normal.set_content_margin_all(10)
	var hover := normal.duplicate()
	hover.bg_color = Color(0.25, 0.3, 0.2, 0.95)
	hover.border_color = Color(0.49, 0.55, 0.33)
	var pressed := normal.duplicate()
	pressed.bg_color = Color(0.35, 0.42, 0.25)
	var disabled := normal.duplicate()
	disabled.bg_color = Color(0.1, 0.12, 0.13, 0.6)
	_theme.set_stylebox("normal", "Button", normal)
	_theme.set_stylebox("hover", "Button", hover)
	_theme.set_stylebox("pressed", "Button", pressed)
	_theme.set_stylebox("disabled", "Button", disabled)
	_theme.set_color("font_color", "Button", Color(0.91, 0.89, 0.83))
	_theme.set_color("font_disabled_color", "Button", Color(0.5, 0.52, 0.5))
	_theme.set_font_size("font_size", "Button", 24)
	_theme.set_font_size("font_size", "Label", 20)
	_theme.set_color("font_color", "Label", Color(0.91, 0.89, 0.83))
	var panel := StyleBoxFlat.new()
	panel.bg_color = Color(0.11, 0.15, 0.17, 0.92)
	panel.border_color = Color(0.16, 0.21, 0.24)
	panel.set_border_width_all(1)
	panel.set_content_margin_all(14)
	_theme.set_stylebox("panel", "PanelContainer", panel)

func _background() -> void:
	var bg := TextureRect.new()
	var g := Gradient.new()
	g.set_color(0, Color(0.15, 0.2, 0.23))
	g.set_color(1, Color(0.1, 0.13, 0.12))
	g.add_point(0.55, Color(0.23, 0.29, 0.26))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill_from = Vector2(0.5, 0.0)
	gt.fill_to = Vector2(0.5, 1.0)
	gt.width = 8
	gt.height = 256
	bg.texture = gt
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	add_child(bg)
	# silhouette of hills, trees and a house
	var sil := Control.new()
	sil.set_anchors_preset(Control.PRESET_FULL_RECT)
	sil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sil.draw.connect(func():
		var s := sil.size
		var col := Color(0.06, 0.08, 0.07)
		var pts := PackedVector2Array([Vector2(0, s.y * 0.8), Vector2(s.x * 0.25, s.y * 0.7), Vector2(s.x * 0.5, s.y * 0.78), Vector2(s.x, s.y * 0.72), Vector2(s.x, s.y), Vector2(0, s.y)])
		sil.draw_colored_polygon(pts, col)
		sil.draw_rect(Rect2(s.x * 0.76, s.y * 0.6, s.x * 0.06, s.y * 0.14), col)
		sil.draw_colored_polygon(PackedVector2Array([Vector2(s.x * 0.75, s.y * 0.6), Vector2(s.x * 0.79, s.y * 0.54), Vector2(s.x * 0.83, s.y * 0.6)]), col)
		sil.draw_circle(Vector2(s.x * 0.2, s.y * 0.66), s.y * 0.05, col)
		sil.draw_rect(Rect2(s.x * 0.2 - 4, s.y * 0.66, 8, s.y * 0.07), col))
	add_child(sil)

func show_screen(name: String) -> void:
	for k in screens:
		screens[k].visible = (k == name)
	refresh()

func refresh() -> void:
	var S: Dictionary = Game.S
	player_name_l.text = str(S.name)
	player_stats_l.text = "LVL: %d\nKills: %d\nMissions completed: %d\nDeaths: %d" % [Game.level_of_player(), S.kills, S.missions, S.deaths]
	for l in wallet_labels:
		l.text = "Weapoints: %d · Medals: %d" % [S.wp, S.medals]
	_fill_play()
	_fill_store()

func _margin(content: Control) -> MarginContainer:
	var m := MarginContainer.new()
	m.set_anchors_preset(Control.PRESET_FULL_RECT)
	for s in ["left", "right", "top", "bottom"]:
		m.add_theme_constant_override("margin_" + s, 36)
	m.add_child(content)
	return m

func _btn(text: String, cb: Callable, size_px: int = 24) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", size_px)
	b.pressed.connect(cb)
	return b

func _header(title: String) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 14)
	h.add_child(_btn("Back", show_screen.bind("main")))
	var t := Label.new()
	t.text = title
	t.add_theme_font_size_override("font_size", 44)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(t)
	return h

func _wallet() -> Label:
	var l := Label.new()
	wallet_labels.append(l)
	return l

# ---------- 1 main screen ----------
func _main_screen() -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	var t := Label.new()
	t.text = "BLACK\nORDER"
	t.add_theme_font_size_override("font_size", 68)
	v.add_child(t)
	var sub := Label.new()
	sub.text = "Campaign 2015 · version 0.1 (Godot)"
	sub.add_theme_color_override("font_color", Color(0.6, 0.64, 0.6))
	v.add_child(sub)
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, 24)
	v.add_child(sp)
	for item in [["Play", "play"], ["Multiplayer", "multi"], ["Settings", "settings"], ["Store", "store"]]:
		var b := _btn(item[0], show_screen.bind(item[1]), 30)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.custom_minimum_size = Vector2(300, 0)
		v.add_child(b)
	var q := _btn("Quit", func(): get_tree().quit(), 30)
	q.alignment = HORIZONTAL_ALIGNMENT_LEFT
	q.custom_minimum_size = Vector2(300, 0)
	v.add_child(q)
	var root := _margin(v)
	# player box in the top right (outside the MarginContainer, otherwise it would stretch across the whole screen)
	var pb := PanelContainer.new()
	pb.anchor_left = 1.0
	pb.anchor_right = 1.0
	pb.anchor_top = 0.0
	pb.anchor_bottom = 0.0
	pb.offset_left = -290.0
	pb.offset_right = -30.0
	pb.offset_top = 24.0
	pb.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	var pv := VBoxContainer.new()
	player_name_l = Label.new()
	player_name_l.add_theme_font_size_override("font_size", 26)
	player_stats_l = Label.new()
	player_stats_l.add_theme_font_size_override("font_size", 16)
	player_stats_l.add_theme_color_override("font_color", Color(0.6, 0.64, 0.6))
	pv.add_child(player_name_l)
	pv.add_child(player_stats_l)
	pb.add_child(pv)
	var wrap := Control.new()
	wrap.set_anchors_preset(Control.PRESET_FULL_RECT)
	wrap.add_child(root)
	wrap.add_child(pb)
	return wrap

# ---------- 2 play ----------
func _play_screen() -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	var h := _header("Play")
	h.add_child(_wallet())
	v.add_child(h)
	play_box = VBoxContainer.new()
	play_box.add_theme_constant_override("separation", 10)
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.add_child(play_box)
	play_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_child(sc)
	return _margin(v)

func _fill_play() -> void:
	if play_box == null:
		return
	for c in play_box.get_children():
		c.queue_free()
	for i in Game.LEVELS.size():
		var L: Dictionary = Game.LEVELS[i]
		var p := PanelContainer.new()
		var v := VBoxContainer.new()
		var t := Label.new()
		t.text = "Mission %d: %s" % [i + 1, L.n]
		t.add_theme_font_size_override("font_size", 30)
		var d := Label.new()
		d.text = "%s\nEnemies: %d · Mines: %d · Reward: %d WP, %d medals" % [L.txt, L.en, L.mines, L.reward, L.medals]
		d.add_theme_color_override("font_color", Color(0.6, 0.64, 0.6))
		var b := _btn("Start mission" if i <= int(Game.S.max_level) else "Locked", _start.bind(i), 22)
		b.disabled = i > int(Game.S.max_level)
		b.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		v.add_child(t)
		v.add_child(d)
		v.add_child(b)
		p.add_child(v)
		play_box.add_child(p)
	for nm in ["Training", "Survival", "Zombie Arena"]:
		var p := PanelContainer.new()
		p.modulate = Color(1, 1, 1, 0.5)
		var l := Label.new()
		l.text = "%s – coming after the campaign" % nm
		p.add_child(l)
		play_box.add_child(p)

func _start(i: int) -> void:
	Game.current_level = i
	get_tree().change_scene_to_file("res://scenes/mission.tscn")

# ---------- 3 multiplayer (visuals only) ----------
func _multi_screen() -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	var h := _header("Multiplayer")
	h.add_child(_btn("Store", show_screen.bind("store")))
	h.add_child(_btn("Settings", show_screen.bind("settings")))
	v.add_child(h)
	var info := Label.new()
	info.text = "Interface mock-up based on the sketch. The online part comes after the campaign."
	info.add_theme_color_override("font_color", Color(0.6, 0.64, 0.6))
	v.add_child(info)
	var code := Label.new()
	code.add_theme_font_size_override("font_size", 40)
	code.add_theme_color_override("font_color", Color(0.49, 0.55, 0.33))
	var chars := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	var c := ""
	for i in 6:
		c += chars[randi() % chars.length()]
	code.text = "Party code: " + c
	v.add_child(code)
	var modes := HBoxContainer.new()
	for m in ["1v1", "2v2", "3v3", "4v4", "5v5"]:
		var mb := Button.new()
		mb.text = m
		mb.toggle_mode = true
		modes.add_child(mb)
	v.add_child(modes)
	var row := HBoxContainer.new()
	var le := LineEdit.new()
	le.placeholder_text = "Party code"
	le.custom_minimum_size = Vector2(200, 0)
	var msg := Label.new()
	row.add_child(le)
	row.add_child(_btn("Join", func(): msg.text = "Online play is not available yet." if le.text.strip_edges() != "" else "Enter the party code.", 22))
	row.add_child(_btn("Create Party", func(): msg.text = "Party created. The code is at the top.", 22))
	v.add_child(row)
	v.add_child(msg)
	return _margin(v)

# ---------- 4 settings ----------
func _slider(parent: Control, text: String, mn: float, mx: float, val: float, cb: Callable) -> void:
	var r := HBoxContainer.new()
	var l := Label.new()
	l.text = text
	l.custom_minimum_size = Vector2(260, 0)
	var s := HSlider.new()
	s.min_value = mn
	s.max_value = mx
	s.step = (mx - mn) / 100.0
	s.value = val
	s.custom_minimum_size = Vector2(320, 24)
	s.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	s.value_changed.connect(cb)
	r.add_child(l)
	r.add_child(s)
	parent.add_child(r)

func _settings_screen() -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	v.add_child(_header("Settings"))
	var tabs := TabContainer.new()
	tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var audio := VBoxContainer.new()
	audio.name = "Audio"
	_slider(audio, "Effects volume", 0.0, 1.0, float(Game.S.vol), func(x): Game.S.vol = x; Game.save_profile())
	var ctrl := VBoxContainer.new()
	ctrl.name = "Controls"
	_slider(ctrl, "Mouse sensitivity", 0.1, 1.0, float(Game.S.sens), func(x): Game.S.sens = x; Game.save_profile())
	var keys := Label.new()
	keys.text = "Movement: W A S D\nSprint / jump: Shift / Space\nFire / aim: left / right mouse button\nReload: R\nWeapons: 1 primary · 2 secondary · 3 knife · 4 grenade\nPause: Esc"
	ctrl.add_child(keys)
	var gm := VBoxContainer.new()
	gm.name = "Game"
	_slider(gm, "Field of view (FOV)", 60.0, 110.0, float(Game.S.fov), func(x): Game.S.fov = x; Game.save_profile())
	gm.add_child(_btn("Delete progress", func(): Game.reset_profile(); refresh(), 22))
	tabs.add_child(audio)
	tabs.add_child(ctrl)
	tabs.add_child(gm)
	v.add_child(tabs)
	return _margin(v)

# ---------- 5 store ----------
func _store_screen() -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	var h := _header("Store")
	h.add_child(_wallet())
	v.add_child(h)
	store_msg = Label.new()
	store_msg.add_theme_color_override("font_color", Color(0.9, 0.5, 0.35))
	v.add_child(store_msg)
	store_tabs = TabContainer.new()
	store_tabs.size_flags_vertical = Control.SIZE_EXPAND_FILL
	for cat in [["primary", "Primary"], ["secondary", "Secondary"], ["melee", "Melee"], ["grenade", "Grenade"]]:
		var sc := ScrollContainer.new()
		sc.name = cat[1]
		var box := VBoxContainer.new()
		box.name = "box"
		box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		sc.add_child(box)
		sc.set_meta("cat", cat[0])
		store_tabs.add_child(sc)
	v.add_child(store_tabs)
	return _margin(v)

func _fill_store() -> void:
	if store_tabs == null:
		return
	for sc in store_tabs.get_children():
		var box: VBoxContainer = sc.get_node("box")
		for c in box.get_children():
			c.queue_free()
		var cat: String = sc.get_meta("cat")
		for id in Game.WEAPONS:
			var w: Dictionary = Game.WEAPONS[id]
			if w.cat != cat:
				continue
			var row := HBoxContainer.new()
			row.add_theme_constant_override("separation", 12)
			var n := Label.new()
			n.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var detail := "Melee weapon" if w.get("melee", false) else ("Explosive, 3 per mission" if cat == "grenade" else "Damage %d%s · magazine %d" % [int(w.dmg), (" × %d" % w.pellets) if w.has("pellets") else "", w.mag])
			n.text = "%s   (%s)" % [w.name, detail]
			var price := Label.new()
			var owned: bool = Game.S.owned.has(id)
			price.text = "Owned" if owned else ("%d medals" % w.medals if w.has("medals") else "%d Weapoints" % w.price)
			price.add_theme_color_override("font_color", Color(0.6, 0.64, 0.6))
			var b := Button.new()
			b.add_theme_font_size_override("font_size", 20)
			if not owned:
				b.text = "Koupit"
				b.pressed.connect(_buy.bind(id))
			elif cat == "primary" or cat == "secondary":
				var cur: bool = Game.S[cat] == id
				b.text = "Vybaveno" if cur else "Vybavit"
				b.disabled = cur
				b.pressed.connect(_equip.bind(id))
			else:
				b.text = "Vybaveno"
				b.disabled = true
			row.add_child(n)
			row.add_child(price)
			row.add_child(b)
			box.add_child(row)
		for nm in Game.SOON[cat]:
			var l := Label.new()
			l.text = "%s – coming in a later version" % nm
			l.modulate = Color(1, 1, 1, 0.45)
			box.add_child(l)

func _buy(id: String) -> void:
	var w: Dictionary = Game.WEAPONS[id]
	if Game.buy(id):
		store_msg.text = ""
	elif w.has("medals"):
		store_msg.text = "Not enough medals (%d / %d). You earn them in missions." % [Game.S.medals, w.medals]
	else:
		store_msg.text = "Not enough Weapoints (%d / %d)." % [Game.S.wp, w.price]
	refresh()

func _equip(id: String) -> void:
	Game.equip(id)
	refresh()
