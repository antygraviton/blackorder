extends Node3D
## One mission: generates terrain, fences, houses, vegetation, mines and enemies and enforces the rules.

const Tex = preload("res://scripts/tex.gd")
const GunModel = preload("res://scripts/gunmodel.gd")
const PlayerScript = preload("res://scripts/player.gd")
const EnemyScript = preload("res://scripts/enemy.gd")
const HudScript = preload("res://scripts/hud.gd")

var L: Dictionary
var rng := RandomNumberGenerator.new()
var noise := FastNoiseLite.new()
var ridge := FastNoiseLite.new()
var player
var hud
var entities: Node3D
var enemies: Array = []
var mines: Array = []
var kits: Array = []
var blockers: Array = []   # Rect2 in the XZ plane (everything that blocks placement)
var map_rects: Array = []  # buildings for the minimap
var killed := 0
var total := 0
var over := false
var last_beep := 0.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	L = Game.LEVELS[Game.current_level]
	rng.seed = int(L.seed) * 101
	noise.seed = int(L.seed)
	noise.frequency = 0.018
	noise.fractal_octaves = 3
	ridge.seed = int(L.seed) + 5
	ridge.frequency = 0.011
	ridge.fractal_octaves = 4
	_environment()
	_terrain()
	_fences()
	_houses()
	_props()
	_vegetation()
	_smoke_columns()
	entities = Node3D.new()
	entities.process_mode = Node.PROCESS_MODE_PAUSABLE
	add_child(entities)
	_entities()
	hud_update()
	say(str(L.txt), 4.0)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

# ---------------- terrain height ----------------
func H(x: float, z: float) -> float:
	var r := maxf(absf(x), absf(z))
	var h := noise.get_noise_2d(x, z) * 1.6
	if r < 90.0:
		h *= 0.25 + 0.75 * smoothstep(3.0, 11.0, absf(x))
	var rd := 1.0 - absf(ridge.get_noise_2d(x, z))
	h += smoothstep(84.0, 150.0, r) * (20.0 + rd * 85.0) + smoothstep(150.0, 240.0, r) * 60.0
	return h

# ---------------- helpers ----------------
func raycast(from: Vector3, to: Vector3, mask: int, exclude: Array, areas: bool) -> Dictionary:
	var q := PhysicsRayQueryParameters3D.create(from, to, mask, exclude)
	q.collide_with_areas = areas
	q.collide_with_bodies = true
	return get_world_3d().direct_space_state.intersect_ray(q)

func blocked(x: float, z: float, m: float) -> bool:
	for r in blockers:
		if (r as Rect2).grow(m).has_point(Vector2(x, z)):
			return true
	return false

func free_spot(use_rng: bool, min_start: float, margin: float, half: float = 70.0) -> Vector2:
	for i in 300:
		var x := (rng.randf() if use_rng else randf()) * 2.0 * half - half
		var z := (rng.randf() if use_rng else randf()) * 2.0 * half - half
		if Vector2(x, z - 70.0).length() < min_start:
			continue
		if blocked(x, z, margin):
			continue
		return Vector2(x, z)
	return Vector2(0, -40)

func static_box(pos: Vector3, size: Vector3, layer: int = 1) -> StaticBody3D:
	var b := StaticBody3D.new()
	b.collision_layer = layer
	b.collision_mask = 0
	var cs := CollisionShape3D.new()
	var s := BoxShape3D.new()
	s.size = size
	cs.shape = s
	b.add_child(cs)
	b.position = pos
	add_child(b)
	return b

func mesh_box(size: Vector3, pos: Vector3, mat: Material, collide: bool = false, rot: float = 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	mi.rotation.y = rot
	add_child(mi)
	if collide:
		var sb := static_box(pos, size)
		sb.rotation.y = rot
	return mi

func mm(mesh: Mesh, mat: Material, xf: Array, colors: Array = [], shadow: bool = true) -> void:
	if xf.is_empty():
		return
	var m := MultiMesh.new()
	m.transform_format = MultiMesh.TRANSFORM_3D
	m.use_colors = colors.size() > 0
	m.mesh = mesh
	m.instance_count = xf.size()
	for i in xf.size():
		m.set_instance_transform(i, xf[i])
		if m.use_colors:
			m.set_instance_color(i, colors[i])
	var mi := MultiMeshInstance3D.new()
	mi.multimesh = m
	mi.material_override = mat
	if not shadow:
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)

func vcol_mat(rough: float = 0.9) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.roughness = rough
	return m

func xform(pos: Vector3, scl: Vector3, yaw: float = 0.0) -> Transform3D:
	return Transform3D(Basis(Vector3.UP, yaw).scaled(scl), pos)

func jitter(c: Color, a: float) -> Color:
	var v := rng.randf_range(-a, a)
	return Color(clampf(c.r + v, 0, 1), clampf(c.g + v, 0, 1), clampf(c.b + v, 0, 1))

# ---------------- environment ----------------
func _environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sm := ProceduralSkyMaterial.new()
	sm.sky_top_color = L.sky_top
	sm.sky_horizon_color = L.sky_hor
	sm.ground_horizon_color = L.fog
	sm.ground_bottom_color = L.fog.darkened(0.3)
	sm.sun_angle_max = 25.0
	sky.sky_material = sm
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = float(L.amb)
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = L.fog
	env.fog_density = float(L.fog_d)
	env.glow_enabled = true
	env.glow_intensity = 0.5
	env.ssao_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	var sd: Vector3 = (L.sun_dir as Vector3).normalized()
	sun.light_color = L.sun_c
	sun.light_energy = float(L.sun_i)
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 130.0
	add_child(sun)
	sun.look_at_from_position(Vector3.ZERO, -sd, Vector3.UP)

func _terrain() -> void:
	var N := 150
	var size := 480.0
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var cg: Color = L.grass
	var cd: Color = L.dirt
	var cr: Color = L.road
	var k1: Color = L.rock
	var k2: Color = L.rock2
	for j in N + 1:
		for i in N + 1:
			var x := (float(i) / N - 0.5) * size
			var z := (float(j) / N - 0.5) * size
			var y := H(x, z)
			var sx := H(x + 2.0, z) - H(x - 2.0, z)
			var sz := H(x, z + 2.0) - H(x, z - 2.0)
			var slope := Vector2(sx, sz).length() / 4.0
			var nz := (noise.get_noise_2d(x * 3.3, z * 3.3) + 1.0) * 0.5
			var r := maxf(absf(x), absf(z))
			var c := cg.lerp(cd, smoothstep(0.45, 0.66, nz))
			if r < 88.0:
				c = c.lerp(cr, 1.0 - smoothstep(2.6, 5.6, absf(x)))
			var rock := maxf(smoothstep(0.45, 0.95, slope), smoothstep(16.0, 60.0, y))
			c = c.lerp(k1.lerp(k2, nz), rock)
			var sh := 0.86 + noise.get_noise_2d(x * 20.0, z * 20.0) * 0.14
			c = Color(c.r * sh, c.g * sh, c.b * sh)
			st.set_color(c)
			st.set_uv(Vector2(x, z) / 5.5)
			st.add_vertex(Vector3(x, y, z))
	for j in N:
		for i in N:
			var a := j * (N + 1) + i
			var b := a + 1
			var c2 := a + N + 1
			var d := c2 + 1
			st.add_index(a); st.add_index(b); st.add_index(c2)
			st.add_index(b); st.add_index(d); st.add_index(c2)
	st.generate_normals()
	var mesh := st.commit()
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	var mt := StandardMaterial3D.new()
	mt.vertex_color_use_as_albedo = true
	mt.albedo_texture = Tex.get_tex("ground")
	mt.roughness = 1.0
	mi.material_override = mt
	add_child(mi)
	mi.create_trimesh_collision()

# ---------------- fences instead of walls ----------------
func _fences() -> void:
	var B := 78.0
	_fence(Vector3(-B, 0, B), Vector3(B, 0, B), "wood")
	_fence(Vector3(-B, 0, -B), Vector3(B, 0, -B), "wood")
	_fence(Vector3(-B, 0, -B), Vector3(-B, 0, B), "chain")
	_fence(Vector3(B, 0, -B), Vector3(B, 0, B), "wire")

func _fence(a: Vector3, b: Vector3, type: String) -> void:
	var len := a.distance_to(b)
	var dir := (b - a) / len
	var yaw := atan2(-dir.z, dir.x)
	var n := int(round(len / 3.0))
	var span := len / n
	# collision: on layer 16 (player and enemies respect it, bullets and view do not see it)
	var mid := (a + b) * 0.5
	var sz := Vector3(maxf(0.5, absf(dir.x) * len), 3.0, maxf(0.5, absf(dir.z) * len))
	static_box(Vector3(mid.x, 1.5, mid.z), sz, 16)
	blockers.append(Rect2(mid.x - sz.x / 2.0, mid.z - sz.z / 2.0, sz.x, sz.z))
	var posts: Array = []
	var rails: Array = []
	var pickets: Array = []
	var wires: Array = []
	var chains: Array = []
	for i in n + 1:
		var p := a + dir * span * i
		posts.append(xform(Vector3(p.x, H(p.x, p.z) + 0.95, p.z), Vector3.ONE))
	for i in n:
		var c := a + dir * span * (i + 0.5)
		var gy := H(c.x, c.z)
		match type:
			"wood":
				rails.append(xform(Vector3(c.x, gy + 0.45, c.z), Vector3.ONE, yaw))
				rails.append(xform(Vector3(c.x, gy + 1.15, c.z), Vector3.ONE, yaw))
				for k in range(-6, 6):
					if rng.randf() < 0.07:
						continue
					var off := (k + 0.5) * 0.25
					var q := c + dir * off
					pickets.append(xform(Vector3(q.x, H(q.x, q.z) + 0.72 + rng.randf_range(-0.04, 0.04), q.z), Vector3(1, rng.randf_range(0.9, 1.1), 1), yaw))
			"chain":
				chains.append(xform(Vector3(c.x, gy + 0.95, c.z), Vector3.ONE, yaw))
				rails.append(xform(Vector3(c.x, gy + 1.88, c.z), Vector3.ONE, yaw))
				for s in 3:
					wires.append(xform(Vector3(c.x, gy + 2.0 + s * 0.1, c.z), Vector3.ONE, yaw))
			_:
				for s in 5:
					wires.append(xform(Vector3(c.x, gy + 0.35 + s * 0.36, c.z), Vector3.ONE, yaw))
	var wood_mat := Tex.mat("wood", 1.5, Color.WHITE, 0.85)
	var metal := Tex.plain(Color(0.35, 0.36, 0.37), 0.5, 0.8)
	var pm := BoxMesh.new()
	pm.size = Vector3(0.15, 1.9, 0.15)
	var pc := CylinderMesh.new()
	pc.top_radius = 0.035
	pc.bottom_radius = 0.035
	pc.height = 2.2
	pc.radial_segments = 6
	mm(pm if type == "wood" else pc, wood_mat if type == "wood" else metal, posts)
	var rm := BoxMesh.new()
	rm.size = Vector3(3.05, 0.08, 0.05)
	mm(rm, wood_mat if type == "wood" else metal, rails, [], false)
	var pk := BoxMesh.new()
	pk.size = Vector3(0.1, 1.4, 0.025)
	mm(pk, wood_mat, pickets, [], false)
	var wm := BoxMesh.new()
	wm.size = Vector3(3.05, 0.012, 0.012)
	mm(wm, Tex.plain(Color(0.25, 0.25, 0.25), 0.5, 0.8), wires, [], false)
	var qm := QuadMesh.new()
	qm.size = Vector2(3.05, 1.8)
	var chain_m := Tex.chain_mat().duplicate() as StandardMaterial3D
	chain_m.uv1_scale = Vector3(6.0, 3.5, 1.0)
	mm(qm, chain_m, chains, [], false)

# ---------------- buildings ----------------
func _houses() -> void:
	var fp: Array = []
	var placed := 0
	var tries := 0
	while placed < int(L.houses) and tries < 600:
		tries += 1
		var w := 8.0 + float(rng.randi() % 5)
		var d := 7.0 + float(rng.randi() % 4)
		var x := (rng.randf() - 0.5) * 136.0
		var z := (rng.randf() - 0.5) * 120.0
		if absf(x) < w / 2.0 + 7.0 or Vector2(x, z - 70.0).length() < 24.0:
			continue
		var ok := true
		for f in fp:
			if absf(f[0] - x) < (f[2] + w) / 2.0 + 6.0 and absf(f[1] - z) < (f[3] + d) / 2.0 + 6.0:
				ok = false
				break
		if not ok:
			continue
		fp.append([x, z, w, d])
		_house(x, z, w, d)
		placed += 1
	for i in int(L.ruins):
		var p := free_spot(true, 24.0, 10.0, 64.0)
		_ruin(p.x, p.y)

func _house(x: float, z: float, w: float, d: float) -> void:
	var hs := [H(x - w / 2, z - d / 2), H(x + w / 2, z - d / 2), H(x - w / 2, z + d / 2), H(x + w / 2, z + d / 2)]
	var lo: float = hs.min()
	var hi: float = hs.max()
	var hgt := 3.1 + rng.randf() * 0.6
	var fl := hi + 0.1
	var plaster := Tex.mat("plaster", 0.3, Color(1, 1, 1), 0.95)
	var roof := Tex.mat("roof", 0.5, Color.WHITE, 0.8)
	var conc := Tex.mat("concrete", 0.4, Color.WHITE, 0.95)
	mesh_box(Vector3(w + 0.2, fl - lo + 0.6, d + 0.2), Vector3(x, lo - 0.3 + (fl - lo + 0.6) / 2.0, z), conc)
	mesh_box(Vector3(w, hgt, d), Vector3(x, fl + hgt / 2.0, z), plaster)
	# roof: two sloped panels
	var pitch := 0.5
	var hr := d / 2.0 + 0.45
	var rise := hr * tan(pitch)
	var sl := hr / cos(pitch)
	for s in [-1.0, 1.0]:
		var rm := mesh_box(Vector3(w + 0.9, 0.14, sl), Vector3(x, fl + hgt + rise / 2.0 + 0.05, z + s * hr / 2.0), roof)
		rm.rotation.x = s * pitch
	# gables (triangles)
	for s in [-1.0, 1.0]:
		var tri := MeshInstance3D.new()
		var pm := PrismMesh.new()
		pm.size = Vector3(d, rise, 0.2)
		pm.left_to_right = 0.5
		tri.mesh = pm
		tri.material_override = plaster
		tri.rotation.y = PI / 2.0
		tri.position = Vector3(x + s * (w / 2.0 - 0.1), fl + hgt + rise / 2.0, z)
		add_child(tri)
	# windows and doors
	var white := Tex.plain(Color(0.9, 0.88, 0.82), 0.7)
	var glass := Tex.plain(Color(0.05, 0.08, 0.1), 0.2, 0.4)
	var door := Tex.mat("wood", 1.5, Color(0.8, 0.6, 0.45), 0.8)
	var nw := maxi(2, int(w / 3.4))
	for s in [-1.0, 1.0]:
		for i in nw:
			var px := x - w / 2.0 + (i + 0.5) * w / nw
			if s > 0.0 and i == nw / 2:
				mesh_box(Vector3(1.1, 2.2, 0.14), Vector3(px, fl + 1.1, z + d / 2.0 + 0.02), door)
				continue
			mesh_box(Vector3(1.0, 1.2, 0.12), Vector3(px, fl + 1.8, z + s * (d / 2.0 + 0.02)), white)
			mesh_box(Vector3(0.8, 1.0, 0.14), Vector3(px, fl + 1.8, z + s * (d / 2.0 + 0.03)), glass)
	var nd := maxi(1, int(d / 4.0))
	for s in [-1.0, 1.0]:
		for i in nd:
			var pz := z - d / 2.0 + (i + 0.5) * d / nd
			mesh_box(Vector3(0.12, 1.2, 1.0), Vector3(x + s * (w / 2.0 + 0.02), fl + 1.8, pz), white)
			mesh_box(Vector3(0.14, 1.0, 0.8), Vector3(x + s * (w / 2.0 + 0.03), fl + 1.8, pz), glass)
	mesh_box(Vector3(0.8, 2.4, 0.8), Vector3(x + w / 4.0, fl + hgt + rise * 0.6 + 0.4, z - d / 4.0), Tex.mat("brick", 0.6))
	static_box(Vector3(x, lo - 0.3 + (fl - lo + hgt + 0.3 + rise) / 2.0, z), Vector3(w, fl - lo + hgt + 0.3 + rise, d))
	var rect := Rect2(x - w / 2.0, z - d / 2.0, w, d)
	blockers.append(rect)
	map_rects.append({"rect": rect, "color": Color(0.5, 0.52, 0.45, 0.8)})

func _ruin(x: float, z: float) -> void:
	var brick := Tex.mat("brick", 0.5, Color(0.85, 0.8, 0.78), 0.95)
	var la := 5.0 + rng.randf() * 5.0
	var lb := 4.0 + rng.randf() * 5.0
	_ruin_wall(x, z, la, true, brick)
	_ruin_wall(x + la / 2.0, z + lb / 2.0, lb, false, brick)
	blockers.append(Rect2(x - la / 2.0, z - 1.0, la, lb + 2.0))
	var rocks: Array = []
	var cols: Array = []
	for i in 7:
		var px := x + (rng.randf() - 0.2) * la
		var pz := z + (rng.randf() - 0.1) * lb
		rocks.append(xform(Vector3(px, H(px, pz) + 0.2, pz), Vector3(0.4 + rng.randf() * 0.8, 0.25 + rng.randf() * 0.4, 0.4 + rng.randf() * 0.8), rng.randf() * 6.0))
		cols.append(jitter(Color(0.45, 0.42, 0.4), 0.06))
	var sm := SphereMesh.new()
	sm.radial_segments = 6
	sm.rings = 4
	var mt := vcol_mat(1.0)
	mt.albedo_texture = Tex.get_tex("rock")
	mm(sm, mt, rocks, cols)

func _ruin_wall(cx: float, cz: float, length: float, along_x: bool, mat: Material) -> void:
	var n := maxi(3, int(length / 1.6))
	var sg := length / n
	for i in n:
		var hh := 1.0 + rng.randf() * (3.0 if rng.randf() < 0.35 else 1.8)
		var px := cx - length / 2.0 + (i + 0.5) * sg if along_x else cx
		var pz := cz if along_x else cz - length / 2.0 + (i + 0.5) * sg
		var gy := H(px, pz)
		var size := Vector3(sg, hh + 0.6, 0.5) if along_x else Vector3(0.5, hh + 0.6, sg)
		mesh_box(size, Vector3(px, gy + hh / 2.0 - 0.3, pz), mat, true)

# ---------------- props ----------------
func _props() -> void:
	var wood := Tex.mat("wood", 1.2, Color.WHITE, 0.85)
	for i in 14:
		var p := free_spot(true, 14.0, 2.5, 68.0)
		var gy := H(p.x, p.y)
		mesh_box(Vector3(1.2, 1.2, 1.2), Vector3(p.x, gy + 0.6, p.y), wood, true, rng.randf() * 0.4)
		if rng.randf() < 0.6:
			mesh_box(Vector3(1, 1, 1), Vector3(p.x + 0.3, gy + 1.7, p.y), wood, false, rng.randf())
		blockers.append(Rect2(p.x - 0.7, p.y - 0.7, 1.4, 1.4))
	for i in 8:
		var p := free_spot(true, 14.0, 3.0, 68.0)
		var gy := H(p.x, p.y)
		var horiz := rng.randf() < 0.5
		var sz := Vector3(3.4, 1.0, 0.8) if horiz else Vector3(0.8, 1.0, 3.4)
		mesh_box(sz, Vector3(p.x, gy + 0.5, p.y), Tex.mat("sand", 1.0, Color.WHITE, 1.0), true)
		blockers.append(Rect2(p.x - sz.x / 2.0, p.y - sz.z / 2.0, sz.x, sz.z))
		map_rects.append({"rect": blockers[-1], "color": Color(0.6, 0.55, 0.4, 0.8)})
	var barrel_cols := [Color(0.48, 0.16, 0.11), Color(0.16, 0.29, 0.42), Color(0.29, 0.35, 0.16)]
	for i in 8:
		var p := free_spot(true, 12.0, 2.0, 68.0)
		var gy := H(p.x, p.y)
		var mi := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.3
		cm.bottom_radius = 0.3
		cm.height = 0.9
		mi.mesh = cm
		mi.material_override = Tex.plain(barrel_cols[i % 3], 0.5, 0.6)
		mi.position = Vector3(p.x, gy + 0.45, p.y)
		add_child(mi)
		static_box(mi.position, Vector3(0.6, 0.9, 0.6))
		blockers.append(Rect2(p.x - 0.4, p.y - 0.4, 0.8, 0.8))
	for i in 3 + Game.current_level:
		var p := free_spot(true, 22.0, 4.0, 64.0)
		_car(p.x, p.y)
	# craters
	for i in 5:
		var p := free_spot(true, 0.0, 6.0, 60.0)
		var r := 2.0 + rng.randf() * 2.5
		var cr := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = r
		cm.bottom_radius = r
		cm.height = 0.05
		cr.mesh = cm
		cr.material_override = Tex.mat("rust", 0.3, Color(0.5, 0.45, 0.4), 1.0)
		cr.position = Vector3(p.x, H(p.x, p.y) + 0.03, p.y)
		cr.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(cr)
	# power-line poles along the road
	var pole_m := Tex.mat("wood", 1.5, Color.WHITE, 0.9)
	var z := -72.0
	while z <= 72.0:
		var gy := H(-7.5, z)
		var pl := MeshInstance3D.new()
		var pm := CylinderMesh.new()
		pm.top_radius = 0.14
		pm.bottom_radius = 0.2
		pm.height = 9.0
		pl.mesh = pm
		pl.material_override = pole_m
		pl.position = Vector3(-7.5, gy + 4.5, z)
		add_child(pl)
		mesh_box(Vector3(2.2, 0.12, 0.12), Vector3(-7.5, gy + 8.5, z), pole_m)
		static_box(Vector3(-7.5, gy + 1.0, z), Vector3(0.5, 2.0, 0.5))
		if z < 72.0:
			for off in [-0.9, 0.0, 0.9]:
				var wire := mesh_box(Vector3(0.015, 0.015, 24.0), Vector3(-7.5 + off, gy + 8.0, z + 12.0), Tex.plain(Color(0.05, 0.05, 0.05)))
		z += 24.0

func _car(x: float, z: float) -> void:
	var gy := H(x, z)
	var yaw := 0.0 if rng.randf() < 0.5 else PI / 2.0
	var g := Node3D.new()
	g.position = Vector3(x, gy, z)
	g.rotation.y = yaw
	add_child(g)
	var rust := Tex.mat("rust", 0.5, Color.WHITE, 0.8, 0.3)
	var dark := Tex.plain(Color(0.04, 0.04, 0.04), 0.9)
	var b1 := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(4.2, 0.8, 1.8)
	b1.mesh = bm
	b1.material_override = rust
	b1.position.y = 0.65
	g.add_child(b1)
	var b2 := MeshInstance3D.new()
	var cm2 := BoxMesh.new()
	cm2.size = Vector3(2.2, 0.7, 1.6)
	b2.mesh = cm2
	b2.material_override = rust
	b2.position = Vector3(-0.2, 1.4, 0)
	g.add_child(b2)
	for sx in [-1.4, 1.4]:
		for sz in [-0.9, 0.9]:
			var w := MeshInstance3D.new()
			var wm := CylinderMesh.new()
			wm.top_radius = 0.34
			wm.bottom_radius = 0.34
			wm.height = 0.25
			w.mesh = wm
			w.material_override = dark
			w.rotation.x = PI / 2.0
			w.position = Vector3(sx, 0.34, sz)
			g.add_child(w)
	var sz := Vector3(4.3, 1.6, 1.9) if yaw == 0.0 else Vector3(1.9, 1.6, 4.3)
	static_box(Vector3(x, gy + 0.8, z), sz)
	var rect := Rect2(x - sz.x / 2.0, z - sz.z / 2.0, sz.x, sz.z)
	blockers.append(rect)
	map_rects.append({"rect": rect, "color": Color(0.45, 0.4, 0.36, 0.8)})
	_smoke(Vector3(x, gy + 1.8, z), 30.0, 0.6)

# ---------------- vegetation ----------------
func _vegetation() -> void:
	var leaf_mat := vcol_mat(0.9)
	leaf_mat.albedo_texture = Tex.get_tex("leaf")
	var bark_mat := vcol_mat(1.0)
	bark_mat.albedo_texture = Tex.get_tex("bark")
	var trunk := CylinderMesh.new()
	trunk.top_radius = 0.14
	trunk.bottom_radius = 0.26
	trunk.height = 1.0
	trunk.radial_segments = 7
	var blob := SphereMesh.new()
	blob.radial_segments = 8
	blob.rings = 5
	var trunks: Array = []
	var tcol: Array = []
	var blobs: Array = []
	var bcol: Array = []
	var greens := [Color(0.43, 0.6, 0.29), Color(0.36, 0.54, 0.24), Color(0.48, 0.64, 0.32), Color(0.31, 0.48, 0.22)]
	for i in 70:
		var x := (rng.randf() - 0.5) * 150.0
		var z := (rng.randf() - 0.5) * 150.0
		if absf(x) < 8.0 or blocked(x, z, 2.0):
			continue
		var s := 0.9 + rng.randf() * 0.7
		var gy := H(x, z)
		trunks.append(xform(Vector3(x, gy + 2.5 * s, z), Vector3(s, 5.0 * s, s), rng.randf() * 6.0))
		tcol.append(Color.WHITE)
		var gc: Color = greens[i % 4]
		for off in [Vector3(0, 5.4, 0), Vector3(1.1, 4.5, 0.4), Vector3(-0.9, 4.8, -0.6)]:
			var sc := 2.3 if off.x == 0.0 else 1.65
			blobs.append(xform(Vector3(x, gy, z) + off * s, Vector3(sc * s, sc * 0.85 * s, sc * s), rng.randf() * 6.0))
			bcol.append(jitter(gc, 0.04))
		static_box(Vector3(x, gy + 1.0, z), Vector3(0.7, 2.0, 0.7))
		blockers.append(Rect2(x - 0.4, z - 0.4, 0.8, 0.8))
	mm(trunk, bark_mat, trunks, tcol)
	mm(blob, leaf_mat, blobs, bcol)
	# pines on the hills behind the fences
	var pine := CylinderMesh.new()
	pine.top_radius = 0.0
	pine.bottom_radius = 1.0
	pine.height = 1.0
	pine.radial_segments = 6
	pine.rings = 1
	var pines: Array = []
	var pcol: Array = []
	for i in 900:
		var a := rng.randf() * TAU
		var r := 84.0 + rng.randf() * 110.0
		var x := cos(a) * r
		var z := sin(a) * r
		var gy := H(x, z)
		if gy > 52.0:
			continue
		var s := 4.0 + rng.randf() * 5.0
		var c := jitter(Color(0.2, 0.33, 0.2), 0.03)
		pines.append(xform(Vector3(x, gy + s * 0.5, z), Vector3(s * 0.34, s, s * 0.34)))
		pcol.append(c)
		pines.append(xform(Vector3(x, gy + s * 1.0, z), Vector3(s * 0.26, s * 0.8, s * 0.26)))
		pcol.append(c)
	mm(pine, leaf_mat, pines, pcol, false)
	# rocks and cliffs
	var rock_m := vcol_mat(1.0)
	rock_m.albedo_texture = Tex.get_tex("rock")
	var rs := SphereMesh.new()
	rs.radial_segments = 7
	rs.rings = 5
	var rocks: Array = []
	var rcol: Array = []
	for i in 46:
		var p := free_spot(true, 12.0, 3.0, 74.0)
		var s := 0.5 + rng.randf() * 1.6
		var gy := H(p.x, p.y)
		rocks.append(xform(Vector3(p.x, gy + s * 0.25, p.y), Vector3(s * (1.0 + rng.randf()), s * (0.5 + rng.randf() * 0.5), s * (1.0 + rng.randf())), rng.randf() * 6.0))
		rcol.append(jitter(Color(0.7, 0.68, 0.64), 0.1))
		if s > 1.25:
			static_box(Vector3(p.x, gy + s * 0.3, p.y), Vector3(s * 1.6, s * 0.9, s * 1.6))
			blockers.append(Rect2(p.x - s * 0.8, p.y - s * 0.8, s * 1.6, s * 1.6))
	for i in 200:
		var a := rng.randf() * TAU
		var r := 88.0 + rng.randf() * 95.0
		var x := cos(a) * r
		var z := sin(a) * r
		var s := 3.0 + rng.randf() * 9.0
		rocks.append(xform(Vector3(x, H(x, z) + s * 0.25, z), Vector3(s * (1.0 + rng.randf() * 0.6), s * (0.6 + rng.randf() * 0.9), s * (1.0 + rng.randf() * 0.6)), rng.randf() * 6.0))
		rcol.append(jitter(Color(0.72, 0.7, 0.66), 0.1))
	mm(rs, rock_m, rocks, rcol)
	# bushes with flowers
	var bushes: Array = []
	var bcols: Array = []
	var flowers: Array = []
	var fcols: Array = []
	var fc := [Color(0.95, 0.65, 0.8), Color(0.97, 0.94, 0.9), Color(0.93, 0.83, 0.42), Color(0.85, 0.47, 0.69)]
	for i in 150:
		var x := (rng.randf() - 0.5) * 150.0
		var z := (rng.randf() - 0.5) * 150.0
		if absf(x) < 5.0 or blocked(x, z, 1.5):
			continue
		var s := 0.6 + rng.randf() * 0.9
		var gy := H(x, z)
		bushes.append(xform(Vector3(x, gy + 0.4 * s, z), Vector3(1.3 * s, 0.8 * s, 1.3 * s), rng.randf() * 6.0))
		bcols.append(jitter(greens[i % 3], 0.05))
		if rng.randf() < 0.55:
			for k in 5:
				var aa := rng.randf() * TAU
				var rr := rng.randf() * 1.0 * s
				flowers.append(xform(Vector3(x + cos(aa) * rr, gy + 0.55 * s + rng.randf() * 0.3 * s, z + sin(aa) * rr), Vector3(0.07, 0.07, 0.07)))
				fcols.append(fc[i % 4])
	mm(blob, leaf_mat, bushes, bcols, false)
	var fm := SphereMesh.new()
	fm.radial_segments = 5
	fm.rings = 3
	mm(fm, vcol_mat(0.6), flowers, fcols, false)

func _smoke_columns() -> void:
	_smoke(Vector3(-95, H(-95, -60), -60), 70.0, 1.0)
	_smoke(Vector3(100, H(100, 30), 30), 80.0, 1.0)
	_smoke(Vector3(20, H(20, -110), -110), 90.0, 1.0)
	if Game.current_level >= 1:
		_smoke(Vector3(-60, H(-60, 40), 40), 50.0, 1.0)
	if Game.current_level == 2:
		_smoke(Vector3(45, H(45, -45), -45), 60.0, 1.0)
		_smoke(Vector3(-30, H(-30, -20), -20), 55.0, 1.0)

func _smoke(pos: Vector3, height: float, size: float) -> void:
	var p := CPUParticles3D.new()
	p.amount = 22
	p.lifetime = height / 5.0
	p.preprocess = p.lifetime
	p.direction = Vector3(0.3, 1.0, 0.1)
	p.spread = 6.0
	p.initial_velocity_min = 4.0
	p.initial_velocity_max = 6.0
	p.gravity = Vector3.ZERO
	p.scale_amount_min = 5.0 * size
	p.scale_amount_max = 12.0 * size
	var qm := QuadMesh.new()
	qm.size = Vector2(1, 1)
	p.mesh = qm
	var mt := StandardMaterial3D.new()
	mt.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mt.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mt.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	mt.vertex_color_use_as_albedo = true
	mt.albedo_texture = Tex.soft_circle()
	p.material_override = mt
	var g := Gradient.new()
	g.set_color(0, Color(0.16, 0.15, 0.14, 0.0))
	g.set_color(1, Color(0.2, 0.19, 0.18, 0.0))
	g.add_point(0.15, Color(0.17, 0.16, 0.15, 0.6))
	g.add_point(0.8, Color(0.25, 0.24, 0.23, 0.35))
	p.color_ramp = g
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(p)
	p.position = pos

# ---------------- entities ----------------
func _entities() -> void:
	player = CharacterBody3D.new()
	player.set_script(PlayerScript)
	player.process_mode = Node.PROCESS_MODE_PAUSABLE
	entities.add_child(player)
	hud = HudScript.new()
	add_child(hud)
	hud.setup(self)
	player.global_position = Vector3(0, H(0, 70) + 0.3, 70)
	player.setup(self)
	for i in int(L.mines):
		var p := free_spot(false, 16.0, 1.6, 72.0)
		var n := Node3D.new()
		var disc := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 0.28
		cm.bottom_radius = 0.3
		cm.height = 0.07
		disc.mesh = cm
		disc.material_override = Tex.plain(Color(0.23, 0.24, 0.17), 0.7, 0.4)
		var led := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.035
		sm.height = 0.07
		led.mesh = sm
		var lm := StandardMaterial3D.new()
		lm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		lm.albedo_color = Color(1, 0.15, 0.0)
		led.material_override = lm
		led.position.y = 0.06
		n.add_child(disc)
		n.add_child(led)
		n.position = Vector3(p.x, H(p.x, p.y) + 0.04, p.y)
		entities.add_child(n)
		mines.append({"node": n, "led": led, "pos": n.position, "live": true})
	for i in int(L.kits):
		var p := free_spot(false, 10.0, 2.0, 70.0)
		var k := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.5, 0.3, 0.35)
		k.mesh = bm
		k.material_override = Tex.plain(Color(0.9, 0.9, 0.87), 0.6)
		var cm := Tex.plain(Color(0.75, 0.09, 0.09), 0.6)
		GunModel.box(k, Vector3(0.3, 0.05, 0.1), Vector3(0, 0.17, 0), cm)
		GunModel.box(k, Vector3(0.1, 0.05, 0.3), Vector3(0, 0.17, 0), cm)
		k.position = Vector3(p.x, H(p.x, p.y) + 0.2, p.y)
		entities.add_child(k)
		kits.append({"node": k, "pos": k.position, "used": false})
	for i in int(L.en):
		var p := free_spot(false, 30.0, 1.8, 72.0)
		var e := CharacterBody3D.new()
		e.set_script(EnemyScript)
		entities.add_child(e)
		e.global_position = Vector3(p.x, H(p.x, p.y) + 0.1, p.y)
		e.setup(self, float(L.hp), float(L.acc))
		enemies.append(e)
	total = enemies.size()

# ---------------- rules ----------------
func hud_update() -> void:
	if player == null or hud == null or player.slots.is_empty():
		return
	var id: String = player.slots[player.cur]
	var w: Dictionary = Game.WEAPONS[id]
	var txt := ""
	if id == "knife":
		txt = "Knife"
	elif id == "m67":
		txt = "Grenades: %d" % player.nades
	elif player.reload_t > 0.0:
		txt = "Reloading…"
	else:
		var a: Dictionary = player.ammo[id]
		txt = "%d / %d" % [a.mag, a.res]
	hud.update_status(player.hp, txt, str(w.name), "Eliminate enemies: %d / %d" % [killed, total], "Mission %d: %s" % [Game.current_level + 1, L.n])

func say(t: String, secs: float) -> void:
	if hud:
		hud.say(t, secs)

func alert_near(pos: Vector3, r: float) -> void:
	for e in enemies:
		if e.alive and e.global_position.distance_to(pos) < r:
			e.alerted = true

func on_enemy_killed(e) -> void:
	killed += 1
	Game.S.kills += 1
	var p = player.ammo.get(player.slots[0])
	if p != null:
		p.res += int(ceil(float(Game.WEAPONS[player.slots[0]].mag) / 2.0))
	hud_update()
	if killed >= total and not over:
		_win()

func on_player_died() -> void:
	over = true
	Game.S.deaths += 1
	Game.S.wp += 10
	Game.save_profile()
	hud.blood(60.0)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	hud.set_scope(false)
	hud.show_end("You died", "Mission failed. You get 10 Weapoints for the effort.", false)

func _win() -> void:
	over = true
	Game.S.missions += 1
	Game.S.wp += int(L.reward)
	Game.S.medals += int(L.medals)
	Game.S.xp += int(L.xp)
	var has_next := Game.current_level < Game.LEVELS.size() - 1
	if has_next:
		Game.S.max_level = maxi(int(Game.S.max_level), Game.current_level + 1)
	Game.save_profile()
	await get_tree().create_timer(0.7).timeout
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	hud.set_scope(false)
	var txt := ("The next mission is unlocked. " if has_next else "The campaign ends in this version, more missions will come. ") + "Reward: %d Weapoints, %d medals, %d XP." % [L.reward, L.medals, L.xp]
	hud.show_end("Mission complete", txt, has_next)

func puff(pos: Vector3, color: Color) -> void:
	_burst(pos, color, 8, 3.0, 0.6)

func blood_burst(pos: Vector3, n: int) -> void:
	_burst(pos, Color(0.54, 0.03, 0.03), n * 2, 3.5, 0.8)

func _burst(pos: Vector3, color: Color, amount: int, speed: float, life: float) -> void:
	var p := CPUParticles3D.new()
	p.one_shot = true
	p.amount = amount
	p.lifetime = life
	p.explosiveness = 1.0
	p.direction = Vector3.UP
	p.spread = 80.0
	p.initial_velocity_min = speed * 0.4
	p.initial_velocity_max = speed
	p.gravity = Vector3(0, -9.0, 0)
	var bm := BoxMesh.new()
	bm.size = Vector3.ONE * 0.06
	p.mesh = bm
	var mt := StandardMaterial3D.new()
	mt.albedo_color = color
	mt.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	p.material_override = mt
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(p)
	p.global_position = pos
	p.emitting = true
	get_tree().create_timer(life + 0.3).timeout.connect(p.queue_free)

func spawn_grenade(pos: Vector3, vel: Vector3) -> void:
	var g := RigidBody3D.new()
	g.collision_layer = 0
	g.collision_mask = 1
	var cs := CollisionShape3D.new()
	var s := SphereShape3D.new()
	s.radius = 0.05
	cs.shape = s
	g.add_child(cs)
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.05
	sm.height = 0.1
	mi.mesh = sm
	mi.material_override = Tex.plain(Color(0.28, 0.33, 0.18), 0.6)
	g.add_child(mi)
	var pm := PhysicsMaterial.new()
	pm.bounce = 0.35
	pm.friction = 0.6
	g.physics_material_override = pm
	entities.add_child(g)
	g.global_position = pos
	g.linear_velocity = vel
	get_tree().create_timer(2.0, false).timeout.connect(func():
		if is_instance_valid(g):
			explode(g.global_position, 7.0, 130.0)
			g.queue_free())

func explode(pos: Vector3, r: float, dm: float) -> void:
	Game.sfx("boom")
	var f := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 2.5
	sm.height = 5.0
	f.mesh = sm
	var mt := StandardMaterial3D.new()
	mt.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mt.albedo_color = Color(1.0, 0.7, 0.28, 0.8)
	mt.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	f.material_override = mt
	add_child(f)
	f.global_position = pos
	var tw := f.create_tween()
	tw.tween_property(f, "scale", Vector3(1.6, 1.6, 1.6), 0.25)
	tw.parallel().tween_property(mt, "albedo_color:a", 0.0, 0.25)
	tw.tween_callback(f.queue_free)
	_burst(pos, Color(0.3, 0.24, 0.17), 30, 7.0, 1.0)
	for e in enemies:
		if e.alive:
			var d: float = e.global_position.distance_to(pos)
			if d < r:
				blood_burst(e.global_position + Vector3(0, 1.2, 0), 8)
				e.take_damage(dm * (1.0 - d / (r + 1.0)), false, e.global_position + Vector3(0, 1.2, 0))
	var dp: float = player.global_position.distance_to(pos)
	if dp < r:
		player.hurt(dm * 0.6 * (1.0 - dp / (r + 1.0)))
		player.shake = 0.05

# ---------------- loop ----------------
func _physics_process(delta: float) -> void:
	if over or get_tree().paused or player == null:
		return
	var t := Time.get_ticks_msec() / 1000.0
	var near := 1e9
	for m in mines:
		if not m.live:
			continue
		(m.led as Node3D).visible = int(t * 2.0) % 2 == 0
		var dpl: float = Vector2(player.global_position.x - m.pos.x, player.global_position.z - m.pos.z).length()
		near = minf(near, dpl)
		var trig: bool = dpl < 1.1 and player.global_position.y - H(player.global_position.x, player.global_position.z) < 1.0
		if not trig:
			for e in enemies:
				if e.alive and Vector2(e.global_position.x - m.pos.x, e.global_position.z - m.pos.z).length() < 0.9:
					trig = true
					break
		if trig:
			m.live = false
			(m.node as Node3D).queue_free()
			explode(m.pos + Vector3(0, 0.3, 0), 6.0, 150.0)
			if dpl < 1.1:
				say("You stepped on a mine", 1.5)
	if near < 6.0:
		hud.warn("Mine nearby! (%d m)" % int(near))
		var period := 0.17 if near < 3.0 else 0.33
		if t - last_beep > period:
			last_beep = t
			Game.sfx("beep", 0.4)
	else:
		hud.warn("")
	for k in kits:
		if not k.used and Vector2(player.global_position.x - k.pos.x, player.global_position.z - k.pos.z).length() < 1.3 and player.hp < 100.0:
			k.used = true
			(k.node as Node3D).queue_free()
			player.heal(40.0)
			say("Medkit +40 HP", 1.5)
			Game.sfx("kit")
	hud_update()

func _unhandled_input(event: InputEvent) -> void:
	if over:
		return
	if event.is_action_pressed("pause"):
		if get_tree().paused:
			resume()
		else:
			get_tree().paused = true
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
			hud.show_pause(true)
	elif event is InputEventMouseButton and event.pressed and not get_tree().paused and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func resume() -> void:
	get_tree().paused = false
	hud.show_pause(false)
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func to_menu() -> void:
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().change_scene_to_file("res://scenes/menu.tscn")

func replay() -> void:
	get_tree().paused = false
	get_tree().reload_current_scene()

func next_mission() -> void:
	get_tree().paused = false
	Game.current_level = mini(Game.current_level + 1, Game.LEVELS.size() - 1)
	get_tree().reload_current_scene()
