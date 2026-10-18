extends CharacterBody3D
## Soldier of the Black Order. The model is built from boxes and cylinders; if res://models/soldier.glb exists, that is used instead.

const GunModel = preload("res://scripts/gunmodel.gd")
const Tex = preload("res://scripts/tex.gd")
const FACE_ROT := 0.0 # rotation of the face texture on the head sphere (see tests/face_probe.gd)

var mission
var hp := 60.0
var acc := 0.5
var alive := true
var alerted := false
var cd := 1.5
var strafe := 1.0
var st := 0.0
var walk := 0.0
var idle_t := 0.0
var flinch := 0.0
var mf: MeshInstance3D
var mf_t := 0.0
var legs: Array = []
var hitboxes: Array = []
var kind := 0
var dead_t := 0.0
var model_root: Node3D
var anim: AnimationPlayer

func setup(m, hp_: float, acc_: float) -> void:
	mission = m
	hp = hp_
	acc = acc_
	kind = randi() % 4
	collision_layer = 4
	collision_mask = 1 | 2 | 16
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.38
	cap.height = 1.8
	cs.shape = cap
	cs.position.y = 0.9
	add_child(cs)
	_hitbox(true, Vector3(0, 1.72, 0), 0.2)
	_hitbox(false, Vector3(0, 0.78, 0), 0.34, 1.5)
	cd = randf_range(1.0, 3.0)
	strafe = 1.0 if randf() < 0.5 else -1.0
	rotation.y = randf() * TAU
	var custom := Game.try_model("res://models/soldier.glb")
	if custom != null:
		model_root = custom
		add_child(custom)
		anim = custom.find_child("AnimationPlayer", true, false)
		mf = MeshInstance3D.new()
		mf.visible = false
		add_child(mf)
	else:
		_build_body()

func _hitbox(is_head: bool, pos: Vector3, r: float, h: float = 0.0) -> void:
	var a := Area3D.new()
	a.collision_layer = 8
	a.collision_mask = 0
	a.monitoring = false
	var cs := CollisionShape3D.new()
	if is_head:
		var s := SphereShape3D.new()
		s.radius = r
		cs.shape = s
	else:
		var c := CapsuleShape3D.new()
		c.radius = r
		c.height = h
		cs.shape = c
	cs.position = pos
	a.add_child(cs)
	a.set_meta("enemy", self)
	a.set_meta("head", is_head)
	add_child(a)
	hitboxes.append(a)

func _build_body() -> void:
	var camo_k: String = ["camo_wood", "camo_digi", "camo_tan"][(kind + randi() % 2) % 3]
	var camo := Tex.mat(camo_k, 2.2, Color.WHITE, 0.95)
	var vest := Tex.plain([Color(0.33, 0.29, 0.2), Color(0.21, 0.23, 0.17), Color(0.1, 0.1, 0.11)][randi() % 3], 0.9)
	var black := Tex.plain(Color(0.07, 0.07, 0.08), 0.8)
	var boot := Tex.plain(Color(0.12, 0.1, 0.08), 0.8)
	var skin := Tex.plain(Color(0.7, 0.52, 0.4), 0.7)
	for s in [-1.0, 1.0]:
		var hip := Node3D.new()
		hip.position = Vector3(s * 0.1, 0.92, 0)
		add_child(hip)
		var knee := Node3D.new()
		knee.position = Vector3(0, -0.46, 0)
		hip.add_child(knee)
		GunModel.limb(hip, Vector3(0, 0, 0), Vector3(0, -0.46, 0), 0.085, 0.07, camo)
		GunModel.limb(knee, Vector3(0, 0, 0), Vector3(0, -0.42, 0), 0.07, 0.052, camo)
		GunModel.box(knee, Vector3(0.11, 0.11, 0.3), Vector3(0, -0.45, -0.05), boot)
		GunModel.box(knee, Vector3(0.12, 0.12, 0.05), Vector3(0, -0.02, -0.07), black)
		legs.append({"hip": hip, "knee": knee})
	GunModel.box(self, Vector3(0.36, 0.2, 0.22), Vector3(0, 1.0, 0), camo)
	GunModel.box(self, Vector3(0.38, 0.04, 0.24), Vector3(0, 1.08, 0), black)
	GunModel.box(self, Vector3(0.4, 0.5, 0.24), Vector3(0, 1.33, 0), camo)
	GunModel.box(self, Vector3(0.34, 0.38, 0.08), Vector3(0, 1.33, -0.15), vest)
	for i in 3:
		GunModel.box(self, Vector3(0.08, 0.12, 0.05), Vector3(-0.1 + i * 0.1, 1.18, -0.2), black)
	GunModel.box(self, Vector3(0.34, 0.38, 0.07), Vector3(0, 1.33, 0.14), vest)
	if kind != 3:
		GunModel.box(self, Vector3(0.3, 0.38, 0.14), Vector3(0, 1.34, 0.22), camo)
	for s in [-1.0, 1.0]:
		var sh := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.07
		sm.height = 0.14
		sh.mesh = sm
		sh.material_override = camo
		sh.position = Vector3(s * 0.22, 1.53, 0)
		add_child(sh)
	GunModel.cyl(self, 0.045, 0.09, Vector3(0, 1.61, 0), skin).rotation.x = 0.0
	GunModel.box(self, Vector3(0.08, 0.12, 0.3), Vector3(0.29, 1.5, 0), Tex.plain(Color(0.7, 0.1, 0.1), 0.9))
	# head with face
	var head := MeshInstance3D.new()
	var hm := SphereMesh.new()
	hm.radius = 1.0
	hm.height = 2.0
	head.mesh = hm
	var fmat := StandardMaterial3D.new()
	fmat.albedo_texture = Tex.face(kind)
	fmat.roughness = 0.7
	head.material_override = fmat
	head.scale = Vector3(0.078, 0.105, 0.092)
	head.position = Vector3(0, 1.72, 0)
	head.rotation.y = FACE_ROT
	add_child(head)
	var helm_mat := Tex.plain(Color(0.28, 0.31, 0.22) if kind == 0 else Color(0.1, 0.11, 0.12), 0.7)
	if kind == 0 or kind == 2:
		var hl := MeshInstance3D.new()
		var hs := SphereMesh.new()
		hs.radius = 1.0
		hs.height = 2.0
		hs.is_hemisphere = true
		hl.mesh = hs
		hl.material_override = helm_mat
		hl.scale = Vector3(0.1, 0.095, 0.115)
		hl.position = Vector3(0, 1.74, 0.005)
		add_child(hl)
		for s in [-1.0, 1.0]:
			var cup := GunModel.cyl(self, 0.04, 0.03, Vector3(s * 0.088, 1.715, 0), black)
			cup.rotation = Vector3(0, 0, PI / 2.0)
		if kind == 0:
			GunModel.box(self, Vector3(0.05, 0.04, 0.05), Vector3(0, 1.82, -0.09), black)
			for s in [-1.0, 1.0]:
				GunModel.cyl(self, 0.025, 0.09, Vector3(s * 0.032, 1.835, -0.14), black)
				var gl := MeshInstance3D.new()
				var qm := QuadMesh.new()
				qm.size = Vector2(0.036, 0.036)
				gl.mesh = qm
				var gm := StandardMaterial3D.new()
				gm.albedo_color = Color(0.4, 1.0, 0.75)
				gm.emission_enabled = true
				gm.emission = Color(0.3, 1.0, 0.6)
				gm.emission_energy_multiplier = 2.0
				gl.material_override = gm
				gl.position = Vector3(s * 0.032, 1.835, -0.187)
				gl.rotation.y = PI
				add_child(gl)
			GunModel.box(self, Vector3(0.01, 0.01, 0.09), Vector3(0.08, 1.68, -0.06), black)
		else:
			GunModel.box(self, Vector3(0.14, 0.045, 0.03), Vector3(0, 1.75, -0.103), Tex.plain(Color(0.1, 0.18, 0.25), 0.2, 0.5))
	elif kind == 1:
		GunModel.cyl(self, 0.09, 0.09, Vector3(0, 1.82, 0), camo).rotation = Vector3.ZERO
		GunModel.cyl(self, 0.2, 0.012, Vector3(0, 1.78, 0), camo).rotation = Vector3.ZERO
	else:
		GunModel.cyl(self, 0.09, 0.07, Vector3(0, 1.82, 0), helm_mat).rotation = Vector3.ZERO
		GunModel.box(self, Vector3(0.1, 0.01, 0.08), Vector3(0, 1.79, 0.13), helm_mat)
	# weapon (facing -Z) and arms via simple IK
	var wk: String = ["hk416", "hk416", "ak", "mp5"][randi() % 4]
	var rf := GunModel.build(wk, false)
	rf.position = Vector3(0.03, 1.42, -0.04)
	add_child(rf)
	var rh: Vector3 = rf.position + rf.get_meta("rh")
	var lh: Vector3 = rf.position + rf.get_meta("lh")
	_arm(Vector3(0.22, 1.5, 0), rh, Vector3(0.6, -1, 0.5), camo, black)
	_arm(Vector3(-0.22, 1.5, 0), lh, Vector3(-0.6, -1, 0.2), camo, black)
	mf = MeshInstance3D.new()
	var mfs := SphereMesh.new()
	mfs.radius = 0.1
	mfs.height = 0.2
	mf.mesh = mfs
	var mfm := StandardMaterial3D.new()
	mfm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mfm.albedo_color = Color(1, 0.8, 0.4)
	mf.material_override = mfm
	mf.position = rf.position + rf.get_meta("muzzle")
	mf.visible = false
	add_child(mf)

func _arm(sp: Vector3, hand: Vector3, pole: Vector3, camo: Material, glove: Material) -> void:
	var a := 0.27
	var b := 0.26
	var d := hand - sp
	var ln := d.length()
	var mx := a + b - 0.01
	if ln > mx:
		hand = sp + d.normalized() * mx
		ln = mx
		d = hand - sp
	var dir := d.normalized()
	var x := (a * a - b * b + ln * ln) / (2.0 * ln)
	var h := sqrt(maxf(0.0, a * a - x * x))
	var p := (pole - dir * pole.dot(dir)).normalized()
	var e := sp + dir * x + p * h
	GunModel.limb(self, sp, e, 0.05, 0.043, camo)
	GunModel.limb(self, e, hand, 0.043, 0.036, camo)
	GunModel.box(self, Vector3(0.085, 0.075, 0.1), hand, glove)

func take_damage(v: float, head: bool, point: Vector3) -> void:
	if not alive:
		return
	hp -= v
	alerted = true
	flinch = 0.25
	mission.hud.hit_marker()
	mission.blood_burst(point, 10 if head else 6)
	Game.sfx("hit", 0.5)
	if hp <= 0.0:
		die()

func die() -> void:
	alive = false
	collision_layer = 0
	for a in hitboxes:
		a.collision_layer = 0
	Game.sfx("kill")
	mission.on_enemy_killed(self)

func _physics_process(delta: float) -> void:
	if not alive:
		if dead_t < 1.0:
			dead_t += delta * 2.2
			var q := minf(1.0, dead_t)
			rotation.x = q * 1.5
			if legs.size() == 2:
				legs[0].hip.rotation.x = q * 0.5
				legs[1].hip.rotation.x = -q * 0.3
		velocity = Vector3(0, -5, 0)
		move_and_slide()
		return
	var p = mission.player
	if p == null or p.dead or mission.over:
		return
	var to: Vector3 = p.global_position - global_position
	var flat := Vector3(to.x, 0, to.z)
	var dist := flat.length()
	var see := false
	if dist < 60.0:
		var from := global_position + Vector3(0, 1.7, 0)
		var res: Dictionary = mission.raycast(from, p.global_position + Vector3(0, 1.5, 0), 1, [get_rid()], false)
		see = res.is_empty()
	if see:
		alerted = true
	var walking := false
	if flinch > 0.0:
		flinch -= delta
		rotation.x = 0.18 * (flinch / 0.25)
	else:
		rotation.x = 0.0
	if alerted:
		var f := flat.normalized() if dist > 0.01 else Vector3.FORWARD
		var target := atan2(-f.x, -f.z)
		rotation.y = lerp_angle(rotation.y, target, minf(1.0, delta * 8.0))
		var mv := Vector3.ZERO
		if dist > 16.0:
			mv = f
		elif dist < 8.0:
			mv = -f
		else:
			st -= delta
			if st <= 0.0:
				strafe *= -1.0
				st = randf_range(1.0, 3.0)
			mv = Vector3(-f.z, 0, f.x) * strafe * 0.6
		walking = mv.length() > 0.01
		velocity.x = mv.x * 2.6
		velocity.z = mv.z * 2.6
		velocity.y = velocity.y - 18.0 * delta if not is_on_floor() else -1.0
		move_and_slide()
		cd -= delta
		if see and cd <= 0.0:
			cd = randf_range(0.9, 2.0)
			mf.visible = true
			mf_t = 0.07
			Game.sfx("enemy", 0.5)
			var chance := maxf(0.12, acc - dist / 70.0)
			if randf() < chance:
				p.hurt(randf_range(7.0, 12.0))
	else:
		idle_t += delta * 0.4
		rotation.y += sin(idle_t) * delta * 0.5
		velocity = Vector3(0, -5, 0)
		move_and_slide()
	if mf_t > 0.0:
		mf_t -= delta
		if mf_t <= 0.0:
			mf.visible = false
	if legs.size() == 2:
		if walking:
			walk += delta * 8.0
			var s1 := sin(walk)
			legs[0].hip.rotation.x = s1 * 0.7
			legs[1].hip.rotation.x = -s1 * 0.7
			legs[0].knee.rotation.x = -maxf(0.0, -s1) * 0.9
			legs[1].knee.rotation.x = -maxf(0.0, s1) * 0.9
		else:
			for l in legs:
				l.hip.rotation.x *= 0.8
				l.knee.rotation.x *= 0.8
	if anim:
		var want := "walk" if walking else "idle"
		if anim.has_animation(want) and anim.current_animation != want:
			anim.play(want)
