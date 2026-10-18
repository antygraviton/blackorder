extends CanvasLayer
## HUD: health, ammo, objective, blood on screen, scope aiming, minimap, pause and mission end.

const Tex = preload("res://scripts/tex.gd")
const Minimap = preload("res://scripts/minimap.gd")

var mission
var hp_l: Label
var ammo_l: Label
var obj_l: Label
var msg_l: Label
var warn_l: Label
var cross: Control
var blood_root: Control
var vig: TextureRect
var scope: Control
var minimap: Control
var pause_p: Control
var end_p: Control
var end_title: Label
var end_text: Label
var next_btn: Button
var hit_t := 0.0
var msg_t := 0.0

func setup(m) -> void:
	mission = m
	layer = 5
	process_mode = Node.PROCESS_MODE_ALWAYS
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	# vignette at low health
	vig = TextureRect.new()
	var g := Gradient.new()
	g.set_color(0, Color(0.55, 0.0, 0.0, 0.0))
	g.set_color(1, Color(0.55, 0.0, 0.0, 0.9))
	g.set_offset(0, 0.55)
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(1.0, 1.0)
	gt.width = 256
	gt.height = 256
	vig.texture = gt
	vig.set_anchors_preset(Control.PRESET_FULL_RECT)
	vig.stretch_mode = TextureRect.STRETCH_SCALE
	vig.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	vig.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vig.modulate.a = 0.0
	root.add_child(vig)
	blood_root = Control.new()
	blood_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	blood_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	blood_root.clip_contents = true
	root.add_child(blood_root)
	# scope
	scope = Control.new()
	scope.set_anchors_preset(Control.PRESET_FULL_RECT)
	scope.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scope.visible = false
	scope.draw.connect(_draw_scope)
	root.add_child(scope)
	# crosshair
	cross = Control.new()
	cross.set_anchors_preset(Control.PRESET_CENTER)
	cross.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cross.draw.connect(_draw_cross)
	root.add_child(cross)
	hp_l = _label(root, 44, 0.0, 1.0, 24.0, -80.0, 300.0, 60.0)
	ammo_l = _label(root, 40, 1.0, 1.0, -340.0, -130.0, 320.0, 110.0)
	ammo_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	obj_l = _label(root, 22, 0.0, 0.0, 24.0, 18.0, 500.0, 60.0)
	msg_l = _label(root, 32, 0.5, 0.0, -400.0, 140.0, 800.0, 60.0)
	msg_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	warn_l = _label(root, 26, 0.5, 0.0, -300.0, 220.0, 600.0, 40.0)
	warn_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	warn_l.add_theme_color_override("font_color", Color(0.9, 0.3, 0.2))
	minimap = Minimap.new()
	minimap.mission = mission
	minimap.anchor_left = 1.0
	minimap.anchor_right = 1.0
	minimap.offset_left = -190.0
	minimap.offset_right = -20.0
	minimap.offset_top = 18.0
	minimap.offset_bottom = 188.0
	minimap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(minimap)
	pause_p = _overlay(root, "Pauza", "Click Resume to return to the game.")
	_btn(pause_p, "Resume", mission.resume)
	_btn(pause_p, "To menu", mission.to_menu)
	end_p = _overlay(root, "", "")
	end_title = end_p.get_meta("title")
	end_text = end_p.get_meta("text")
	next_btn = _btn(end_p, "Next mission", mission.next_mission)
	_btn(end_p, "Play again", mission.replay)
	_btn(end_p, "To menu", mission.to_menu)

func _label(parent: Control, size_px: int, ax: float, ay: float, ox: float, oy: float, w: float, hh: float) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", size_px)
	l.add_theme_color_override("font_color", Color(0.91, 0.89, 0.83))
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	l.add_theme_constant_override("shadow_offset_x", 2)
	l.add_theme_constant_override("shadow_offset_y", 2)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(l)
	l.anchor_left = ax
	l.anchor_right = ax
	l.anchor_top = ay
	l.anchor_bottom = ay
	l.offset_left = ox
	l.offset_right = ox + w
	l.offset_top = oy
	l.offset_bottom = oy + hh
	return l

func _overlay(parent: Control, title: String, text: String) -> Control:
	var p := ColorRect.new()
	p.color = Color(0.04, 0.05, 0.06, 0.82)
	p.set_anchors_preset(Control.PRESET_FULL_RECT)
	p.visible = false
	parent.add_child(p)
	var c := CenterContainer.new()
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	p.add_child(c)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	c.add_child(v)
	var t := Label.new()
	t.text = title
	t.add_theme_font_size_override("font_size", 56)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	var x := Label.new()
	x.text = text
	x.custom_minimum_size = Vector2(520, 0)
	x.autowrap_mode = TextServer.AUTOWRAP_WORD
	x.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	x.add_theme_color_override("font_color", Color(0.6, 0.64, 0.6))
	v.add_child(x)
	p.set_meta("title", t)
	p.set_meta("text", x)
	p.set_meta("box", v)
	return p

func _btn(p: Control, text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", 30)
	b.custom_minimum_size = Vector2(260, 48)
	b.pressed.connect(cb)
	p.get_meta("box").add_child(b)
	return b

func _draw_cross() -> void:
	var c := Color(1.0, 0.25, 0.2) if hit_t > 0.0 else Color(0.91, 0.89, 0.83, 0.85)
	cross.draw_line(Vector2(0, -9), Vector2(0, 9), c, 2.0)
	cross.draw_line(Vector2(-9, 0), Vector2(9, 0), c, 2.0)

func _draw_scope() -> void:
	var s := scope.size
	var r := minf(s.x, s.y) * 0.46
	var ctr := s * 0.5
	scope.draw_arc(ctr, r + s.x * 0.5, 0.0, TAU, 96, Color.BLACK, s.x)
	scope.draw_arc(ctr, r, 0.0, TAU, 96, Color(0, 0, 0, 0.9), 3.0)
	scope.draw_line(ctr - Vector2(r, 0), ctr + Vector2(r, 0), Color(0, 0, 0, 0.8), 1.0)
	scope.draw_line(ctr - Vector2(0, r), ctr + Vector2(0, r), Color(0, 0, 0, 0.8), 1.0)

func set_scope(on: bool) -> void:
	if scope.visible != on:
		scope.visible = on
		cross.visible = not on
		scope.queue_redraw()

func hit_marker() -> void:
	hit_t = 0.15
	cross.queue_redraw()

func say(t: String, secs: float) -> void:
	msg_l.text = t
	msg_t = secs

func warn(t: String) -> void:
	warn_l.text = t

func update_status(hp: float, ammo_text: String, weapon_name: String, obj: String, mission_name: String) -> void:
	hp_l.text = "%d HP" % maxi(0, ceili(hp))
	ammo_l.text = "%s\n%s" % [ammo_text, weapon_name]
	obj_l.text = "%s\n%s" % [obj, mission_name]
	vig.modulate.a = clampf((60.0 - hp) / 60.0, 0.0, 1.0)

## Blood on screen: splats appear, slowly run down and fade away.
func blood(dmg: float) -> void:
	var n := 1 + int(dmg / 7.0)
	var vs := blood_root.size
	if vs.x < 10.0:
		vs = Vector2(1280, 720)
	for i in n:
		var t := TextureRect.new()
		t.texture = Tex.soft_circle()
		var sz := randf_range(90.0, 320.0)
		t.size = Vector2(sz, sz * randf_range(0.8, 1.4))
		t.position = Vector2(randf_range(-50.0, vs.x - 100.0), randf_range(-50.0, vs.y - 100.0))
		t.modulate = Color(0.6, 0.02, 0.02, 0.92)
		t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		t.stretch_mode = TextureRect.STRETCH_SCALE
		t.mouse_filter = Control.MOUSE_FILTER_IGNORE
		blood_root.add_child(t)
		var tw := t.create_tween()
		tw.set_parallel(true)
		tw.tween_property(t, "modulate:a", 0.0, 4.5).set_ease(Tween.EASE_IN)
		tw.tween_property(t, "position:y", t.position.y + 46.0, 4.5)
		tw.chain().tween_callback(t.queue_free)
	while blood_root.get_child_count() > 18:
		blood_root.get_child(0).queue_free()
		break

func show_pause(on: bool) -> void:
	pause_p.visible = on

func show_end(title: String, text: String, has_next: bool) -> void:
	end_title.text = title
	end_text.text = text
	next_btn.visible = has_next
	end_p.visible = true

func _process(delta: float) -> void:
	if hit_t > 0.0:
		hit_t -= delta
		if hit_t <= 0.0:
			cross.queue_redraw()
	if msg_t > 0.0:
		msg_t -= delta
		if msg_t <= 0.0:
			msg_l.text = ""
	if minimap:
		minimap.queue_redraw()
