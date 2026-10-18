extends CharacterBody3D
## Player: movement, aiming, 4 weapon slots (primary, secondary, knife, grenade).

const GunModel = preload("res://scripts/gunmodel.gd")

var mission
var cam: Camera3D
var head: Node3D
var vm: Node3D
var view: Node3D
var flash: OmniLight3D
var mflash: MeshInstance3D
var yaw := 0.0
var pitch := 0.0
var hp := 100.0
var dead := false
var slots: Array = []
var cur := 0
var ammo := {}
var nades := 3
var aiming := false
var reload_t := 0.0
var reload_max := 1.6
var last_shot := -10.0
var kick := 0.0
var sway := Vector2.ZERO
var shake := 0.0
var bob_t := 0.0
var flash_t := 0.0
var view_base := Vector3(0.16, -0.19, -0.28)
var view_sy := 0.0
var moving := false

func setup(m) -> void:
	mission = m
	collision_layer = 2
	collision_mask = 1 | 4 | 16
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.4
	cap.height = 1.8
	cs.shape = cap
	cs.position.y = 0.9
	add_child(cs)
	head = Node3D.new()
	head.position.y = 1.7
	add_child(head)
	cam = Camera3D.new()
	cam.fov = Game.S.fov
	cam.near = 0.03
	cam.far = 1500.0
	head.add_child(cam)
	cam.current = true
	vm = Node3D.new()
	cam.add_child(vm)
	flash = OmniLight3D.new()
	flash.omni_range = 9.0
	flash.light_energy = 0.0
	flash.light_color = Color(1, 0.75, 0.4)
	cam.add_child(flash)
	slots = [Game.S.primary, Game.S.secondary, "knife", "m67"]
	for id in slots:
		var w: Dictionary = Game.WEAPONS[id]
		if w.has("mag"):
			ammo[id] = {"mag": w.mag, "res": w.res}
	equip(0)

func equip(i: int) -> void:
	if i < 0 or i >= slots.size():
		return
	cur = i
	reload_t = 0.0
	if view:
		view.queue_free()
	var id: String = slots[i]
	view = GunModel.build(id, true)
	GunModel.add_hands(view)
	view_sy = view.get_meta("sy", 0.0)
	var pos := {"knife": Vector3(0.2, -0.22, -0.28), "m67": Vector3(0.2, -0.22, -0.3), "glock": Vector3(0.14, -0.17, -0.35),
		"revolver": Vector3(0.14, -0.17, -0.35), "shotgun": Vector3(0.16, -0.2, -0.28), "svd": Vector3(0.16, -0.2, -0.3)}
	view_base = pos.get(id, Vector3(0.16, -0.19, -0.28))
	view.position = view_base
	vm.add_child(view)
	_no_shadow(view)
	mflash = null
	if view.has_meta("muzzle"):
		mflash = MeshInstance3D.new()
		var q := QuadMesh.new()
		q.size = Vector2(0.25, 0.25)
		mflash.mesh = q
		var mt := StandardMaterial3D.new()
		mt.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		mt.albedo_color = Color(1, 0.8, 0.4, 0.9)
		mt.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mt.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		mt.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
		mt.albedo_texture = preload("res://scripts/tex.gd").soft_circle()
		mflash.material_override = mt
		mflash.position = view.get_meta("muzzle")
		mflash.visible = false
		view.add_child(mflash)
	mission.hud_update()

func _no_shadow(n: Node) -> void:
	if n is GeometryInstance3D:
		n.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for c in n.get_children():
		_no_shadow(c)

func weapon() -> Dictionary:
	return Game.WEAPONS[slots[cur]]

func _unhandled_input(event: InputEvent) -> void:
	if dead or mission.over or get_tree().paused:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var s := 0.0004 + float(Game.S.sens) * 0.0032
		var z := 0.5 if aiming else 1.0
		yaw -= event.relative.x * s * z
		pitch = clampf(pitch - event.relative.y * s * z, -1.4, 1.4)
		sway.x = clampf(sway.x - event.relative.x * 0.0004, -0.04, 0.04)
		sway.y = clampf(sway.y - event.relative.y * 0.0004, -0.03, 0.03)
	if event.is_action_pressed("slot1"): equip(0)
	if event.is_action_pressed("slot2"): equip(1)
	if event.is_action_pressed("slot3"): equip(2)
	if event.is_action_pressed("slot4"): equip(3)
	if event.is_action_pressed("reload"): reload()

func _physics_process(delta: float) -> void:
	if dead or mission.over:
		return
	var w := weapon()
	aiming = Input.is_action_pressed("aim") and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
	var speed := (7.5 if Input.is_action_pressed("sprint") else 4.6) * (0.6 if aiming else 1.0)
	var inp := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	moving = inp.length() > 0.1
	rotation.y = yaw
	head.rotation.x = pitch
	var dir := (transform.basis * Vector3(inp.x, 0, inp.y)).normalized()
	velocity.x = dir.x * speed
	velocity.z = dir.z * speed
	if not is_on_floor():
		velocity.y -= 18.0 * delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = 5.6
	else:
		velocity.y = -1.0
	move_and_slide()
	# shooting
	if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		if Input.is_action_just_pressed("fire"):
			fire(true)
		elif Input.is_action_pressed("fire") and w.get("auto", false):
			fire(false)
	# reloading
	if reload_t > 0.0:
		reload_t -= delta
		if reload_t <= 0.0:
			var a: Dictionary = ammo[slots[cur]]
			var take := mini(int(w.mag) - int(a.mag), int(a.res))
			a.mag += take
			a.res -= take
			mission.hud_update()
	# zoom and camera
	var z2: float = w.get("zoom", 1.0)
	var tf: float = float(Game.S.fov) / (z2 * (1.8 if w.get("scoped", false) else 1.3) if aiming else 1.0)
	cam.fov = lerpf(cam.fov, tf, 0.2)
	var scoped: bool = aiming and w.get("scoped", false)
	mission.hud.set_scope(scoped)
	if view:
		view.visible = not scoped
	if flash_t > 0.0:
		flash_t -= delta
		if flash_t <= 0.0:
			flash.light_energy = 0.0
			if mflash:
				mflash.visible = false

func _process(delta: float) -> void:
	if view == null or dead:
		return
	bob_t += delta * (14.0 if Input.is_action_pressed("sprint") else 9.0) * (1.0 if moving else 0.0)
	kick = lerpf(kick, 0.0, 0.25)
	sway = sway.lerp(Vector2.ZERO, 0.1)
	var rx := 0.0
	var py := 0.0
	if reload_t > 0.0:
		var q := 1.0 - reload_t / reload_max
		rx = -0.7 * sin(PI * q)
		py = -0.12 * sin(PI * q)
	var tx := view_base.x
	var ty := view_base.y
	if aiming and view_sy > 0.0:
		tx = 0.0
		ty = -view_sy - 0.012
	var bobx := sin(bob_t) * 0.012 if moving and not aiming else 0.0
	var boby := absf(sin(bob_t)) * 0.012 if moving and not aiming else sin(Time.get_ticks_msec() / 600.0) * 0.002
	view.position = view.position.lerp(Vector3(tx + sway.x * 0.6 + bobx, ty + py + sway.y * 0.6 + boby, view_base.z + kick), 0.3)
	view.rotation = Vector3(rx + kick * 1.2 + sway.y, sway.x, 0.0)
	if shake > 0.0:
		cam.rotation = Vector3(randf_range(-shake, shake), randf_range(-shake, shake), 0)
		shake *= 0.85
	else:
		cam.rotation = Vector3.ZERO

func reload() -> void:
	var id: String = slots[cur]
	var w := weapon()
	if not w.has("mag") or reload_t > 0.0:
		return
	var a: Dictionary = ammo[id]
	if a.mag >= w.mag or a.res <= 0:
		return
	reload_max = w.get("rel", 1.6)
	reload_t = reload_max
	Game.sfx("reload")
	mission.hud_update()

func fire(first: bool) -> void:
	var id: String = slots[cur]
	var w := weapon()
	var now := Time.get_ticks_msec() / 1000.0
	if reload_t > 0.0 or now - last_shot < float(w.get("rate", 0.3)):
		return
	if id == "m67":
		if nades <= 0:
			return
		nades -= 1
		last_shot = now
		var d := -cam.global_transform.basis.z
		mission.spawn_grenade(cam.global_position + d * 0.6, d * 18.0 + Vector3(0, 3, 0))
		mission.hud_update()
		return
	if w.get("melee", false):
		last_shot = now
		kick = -0.25
		Game.sfx("knife")
		var f := -cam.global_transform.basis.z
		for e in mission.enemies:
			if e.alive:
				var dv: Vector3 = e.global_position - global_position
				dv.y = 0
				if dv.length() < 2.4 and dv.normalized().dot(Vector3(f.x, 0, f.z).normalized()) > 0.2:
					e.take_damage(float(w.dmg) * 1.6, true, e.global_position + Vector3(0, 1.3, 0))
		return
	var a: Dictionary = ammo[id]
	if a.mag <= 0:
		Game.sfx("hit", 0.3)
		reload()
		return
	if not w.auto and not first:
		return
	a.mag -= 1
	last_shot = now
	shake = 0.012
	kick = 0.05
	flash.light_energy = 3.0
	flash_t = 0.05
	if mflash:
		mflash.visible = true
		mflash.rotation.z = randf() * 6.0
	Game.sfx("heavy" if float(w.dmg) > 60.0 else ("pistol" if w.cat == "secondary" else "rifle"))
	mission.alert_near(global_position, 50.0)
	var n: int = w.get("pellets", 1)
	var sp: float = deg_to_rad(float(w.spread)) * (0.35 if aiming else 1.0)
	var origin := cam.global_position
	var b := cam.global_transform.basis
	for i in n:
		var d := (-b.z).rotated(b.x, randf_range(-sp, sp)).rotated(b.y, randf_range(-sp, sp)).normalized()
		var res: Dictionary = mission.raycast(origin, origin + d * 250.0, 1 | 8, [get_rid()], true)
		if res.is_empty():
			continue
		var col = res.collider
		if col != null and col.has_meta("enemy"):
			var e = col.get_meta("enemy")
			var head_hit: bool = col.get_meta("head", false)
			e.take_damage(float(w.dmg) * (2.5 if head_hit else 1.0), head_hit, res.position)
		elif i < 3:
			mission.puff(res.position, Color(0.6, 0.57, 0.5))
	pitch += 0.004 + (0.02 if n > 1 else 0.0)
	if a.mag <= 0:
		reload()
	mission.hud_update()

func heal(v: float) -> void:
	hp = minf(100.0, hp + v)
	mission.hud_update()

func hurt(v: float) -> void:
	if dead:
		return
	hp -= v
	shake = maxf(shake, 0.03)
	Game.sfx("hurt")
	mission.hud.blood(v)
	mission.hud_update()
	if hp <= 0.0:
		dead = true
		mission.on_player_died()
