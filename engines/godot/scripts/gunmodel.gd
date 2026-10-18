extends RefCounted
## Weapon models built from boxes and cylinders. The firing direction is -Z (Godot convention).
## Custom model: put res://models/<id>.glb (e.g. hk416.glb) in place and it replaces this one.
## Result metadata: muzzle (end of the barrel), rh/lh (hand positions on the pistol grip / handguard), sy (sight height).

const Tex = preload("res://scripts/tex.gd")

static var _m := {}

static func _mats() -> Dictionary:
	if _m.is_empty():
		_m["black"] = Tex.plain(Color(0.08, 0.08, 0.09), 0.45, 0.7)
		_m["tan"] = Tex.plain(Color(0.7, 0.58, 0.4), 0.55, 0.3)
		_m["poly"] = Tex.plain(Color(0.12, 0.12, 0.13), 0.8, 0.05)
		_m["wood"] = Tex.mat("wood", 7.0, Color(1.0, 0.85, 0.7), 0.55)
		_m["steel"] = Tex.plain(Color(0.55, 0.57, 0.6), 0.3, 0.9)
		_m["orange"] = Tex.plain(Color(0.42, 0.2, 0.08), 0.7, 0.1)
		_m["glove"] = Tex.plain(Color(0.09, 0.09, 0.1), 0.9, 0.0)
		_m["sleeve"] = Tex.mat("camo_digi", 5.0, Color.WHITE, 0.95)
		_m["rail"] = Tex.mat("gunmetal", 20.0, Color.WHITE, 0.5, 0.6)
		var glass := StandardMaterial3D.new()
		glass.albedo_color = Color(0.3, 0.8, 0.75, 0.3)
		glass.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		glass.cull_mode = BaseMaterial3D.CULL_DISABLED
		_m["glass"] = glass
		var tube := StandardMaterial3D.new()
		tube.albedo_color = Color(0.06, 0.06, 0.07)
		tube.metallic = 0.7
		tube.roughness = 0.4
		tube.cull_mode = BaseMaterial3D.CULL_DISABLED
		_m["tube"] = tube
		var gren := StandardMaterial3D.new()
		gren.albedo_color = Color(0.28, 0.33, 0.18)
		gren.roughness = 0.6
		_m["gren"] = gren
	return _m

static func box(p: Node3D, size: Vector3, pos: Vector3, mat: Material, rot: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.material_override = mat
	mi.position = pos
	mi.rotation = rot
	p.add_child(mi)
	return mi

static func cyl(p: Node3D, r: float, length: float, pos: Vector3, mat: Material, open: bool = false) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = r
	cm.bottom_radius = r
	cm.height = length
	cm.radial_segments = 12
	cm.rings = 1
	if open:
		cm.cap_top = false
		cm.cap_bottom = false
	mi.mesh = cm
	mi.material_override = mat
	mi.position = pos
	mi.rotation.x = PI / 2.0
	p.add_child(mi)
	return mi

## Cylinder between two points (for arms).
static func limb(p: Node3D, a: Vector3, b: Vector3, r1: float, r2: float, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	var d := b - a
	cm.height = d.length()
	cm.top_radius = r2
	cm.bottom_radius = r1
	cm.radial_segments = 8
	cm.rings = 1
	mi.mesh = cm
	mi.material_override = mat
	mi.position = (a + b) * 0.5
	if d.length() > 0.0001:
		mi.basis = Basis(Quaternion(Vector3.UP, d.normalized()))
	p.add_child(mi)
	return mi

static func build(id: String, detail: bool = true) -> Node3D:
	var custom := _try_custom(id)
	var g := Node3D.new()
	if custom != null and detail:
		g.add_child(custom)
		g.set_meta("muzzle", Vector3(0, 0.02, -0.8))
		g.set_meta("rh", Vector3(0, -0.1, -0.03))
		g.set_meta("lh", Vector3(0, -0.03, -0.5))
		g.set_meta("sy", 0.08)
		g.set_meta("custom", true)
		return g
	var M := _mats()
	match id:
		"hk416":
			box(g, Vector3(.05, .07, .22), Vector3(0, -.045, -.13), M.tan)
			box(g, Vector3(.052, .062, .32), Vector3(0, .018, -.2), M.tan)
			box(g, Vector3(.03, .012, .6), Vector3(0, .056, -.32), M.rail)
			box(g, Vector3(.064, .068, .34), Vector3(0, .012, -.52), M.tan)
			cyl(g, .0095, .14, Vector3(0, .014, -.74), M.black)
			cyl(g, .016, .075, Vector3(0, .014, -.82), M.black)
			box(g, Vector3(.034, .17, .07), Vector3(0, -.15, -.15), M.black, Vector3(.1, 0, 0))
			box(g, Vector3(.036, .11, .05), Vector3(0, -.115, -.02), M.poly, Vector3(.4, 0, 0))
			cyl(g, .016, .2, Vector3(0, .012, .06), M.tan)
			box(g, Vector3(.042, .1, .17), Vector3(0, -.008, .2), M.tan)
			cyl(g, .027, .1, Vector3(0, .1, -.24), M.tube, true)
			cyl(g, .031, .03, Vector3(0, .1, -.3), M.tube, true)
			box(g, Vector3(.03, .03, .07), Vector3(0, .075, -.24), M.black)
			if detail:
				for i in 4:
					box(g, Vector3(.066, .014, .05), Vector3(0, .012, -.4 - i * .07), M.black)
				var lens := MeshInstance3D.new()
				var q := QuadMesh.new()
				q.size = Vector2(.044, .044)
				lens.mesh = q
				lens.material_override = M.glass
				lens.position = Vector3(0, .1, -.19)
				g.add_child(lens)
			g.set_meta("muzzle", Vector3(0, .014, -.87)); g.set_meta("rh", Vector3(0, -.115, -.02)); g.set_meta("lh", Vector3(0, -.035, -.52)); g.set_meta("sy", .1)
		"ak":
			box(g, Vector3(.05, .075, .3), Vector3(0, 0, -.18), M.black)
			box(g, Vector3(.044, .03, .3), Vector3(0, .05, -.18), M.black)
			box(g, Vector3(.054, .05, .22), Vector3(0, -.005, -.46), M.wood)
			box(g, Vector3(.05, .03, .2), Vector3(0, .04, -.46), M.wood)
			cyl(g, .011, .22, Vector3(0, .07, -.5), M.black)
			cyl(g, .0095, .3, Vector3(0, .02, -.7), M.black)
			cyl(g, .015, .06, Vector3(0, .02, -.86), M.black)
			box(g, Vector3(.012, .04, .012), Vector3(0, .045, -.82), M.black)
			box(g, Vector3(.034, .1, .07), Vector3(0, -.1, -.16), M.orange, Vector3(.15, 0, 0))
			box(g, Vector3(.034, .1, .07), Vector3(0, -.19, -.12), M.orange, Vector3(.5, 0, 0))
			box(g, Vector3(.038, .11, .05), Vector3(0, -.1, -.04), M.wood, Vector3(.35, 0, 0))
			box(g, Vector3(.04, .09, .3), Vector3(0, -.01, .2), M.wood)
			g.set_meta("muzzle", Vector3(0, .02, -.9)); g.set_meta("rh", Vector3(0, -.1, -.04)); g.set_meta("lh", Vector3(0, -.03, -.46)); g.set_meta("sy", .078)
		"mp5":
			box(g, Vector3(.05, .07, .3), Vector3(0, 0, -.18), M.black)
			box(g, Vector3(.058, .055, .22), Vector3(0, -.01, -.45), M.poly)
			cyl(g, .011, .08, Vector3(0, .01, -.62), M.black)
			box(g, Vector3(.012, .03, .012), Vector3(0, .035, -.66), M.black)
			box(g, Vector3(.032, .12, .06), Vector3(0, -.12, -.2), M.black, Vector3(.05, 0, 0))
			box(g, Vector3(.032, .1, .06), Vector3(0, -.22, -.19), M.black, Vector3(.15, 0, 0))
			box(g, Vector3(.036, .11, .05), Vector3(0, -.1, -.04), M.poly, Vector3(.35, 0, 0))
			cyl(g, .009, .22, Vector3(.025, .01, .12), M.black)
			box(g, Vector3(.04, .09, .03), Vector3(0, 0, .23), M.black)
			g.set_meta("muzzle", Vector3(0, .01, -.67)); g.set_meta("rh", Vector3(0, -.1, -.04)); g.set_meta("lh", Vector3(0, -.03, -.44)); g.set_meta("sy", .065)
		"svd":
			box(g, Vector3(.052, .075, .28), Vector3(0, 0, -.17), M.black)
			box(g, Vector3(.05, .05, .3), Vector3(0, -.005, -.5), M.wood)
			cyl(g, .013, .4, Vector3(0, .02, -.85), M.black)
			cyl(g, .018, .07, Vector3(0, .02, -1.07), M.black)
			box(g, Vector3(.045, .1, .34), Vector3(0, -.02, .2), M.wood)
			box(g, Vector3(.034, .1, .07), Vector3(0, -.1, -.15), M.black, Vector3(.1, 0, 0))
			cyl(g, .02, .2, Vector3(0, .098, -.2), M.tube, true)
			cyl(g, .028, .06, Vector3(0, .098, -.32), M.tube, true)
			cyl(g, .025, .04, Vector3(0, .098, -.08), M.tube, true)
			box(g, Vector3(.03, .03, .1), Vector3(0, .07, -.2), M.black)
			g.set_meta("muzzle", Vector3(0, .02, -1.12)); g.set_meta("rh", Vector3(0, -.1, -.03)); g.set_meta("lh", Vector3(0, -.03, -.5)); g.set_meta("sy", .098)
		"shotgun":
			box(g, Vector3(.05, .07, .22), Vector3(0, 0, -.13), M.black)
			cyl(g, .013, .6, Vector3(0, .02, -.55), M.black)
			cyl(g, .012, .5, Vector3(0, -.03, -.5), M.black)
			box(g, Vector3(.05, .05, .2), Vector3(0, -.03, -.45), M.wood)
			box(g, Vector3(.045, .09, .3), Vector3(0, -.02, .17), M.wood)
			box(g, Vector3(.04, .1, .05), Vector3(0, -.09, -.02), M.wood, Vector3(.3, 0, 0))
			g.set_meta("muzzle", Vector3(0, .02, -.86)); g.set_meta("rh", Vector3(0, -.09, -.02)); g.set_meta("lh", Vector3(0, -.03, -.45)); g.set_meta("sy", .06)
		"glock":
			box(g, Vector3(.03, .036, .2), Vector3(0, .03, -.1), M.black)
			box(g, Vector3(.028, .022, .17), Vector3(0, 0, -.1), M.poly)
			box(g, Vector3(.03, .1, .045), Vector3(0, -.05, 0), M.poly, Vector3(-.2, 0, 0))
			box(g, Vector3(.012, .03, .05), Vector3(0, -.025, -.12), M.poly)
			box(g, Vector3(.006, .012, .008), Vector3(0, .054, -.19), M.black)
			box(g, Vector3(.01, .012, .008), Vector3(0, .054, -.015), M.black)
			g.set_meta("muzzle", Vector3(0, .03, -.22)); g.set_meta("rh", Vector3(0, -.04, 0)); g.set_meta("lh", Vector3(-.02, -.06, -.02)); g.set_meta("sy", .056)
		"revolver":
			box(g, Vector3(.028, .05, .14), Vector3(0, 0, -.07), M.steel)
			cyl(g, .026, .06, Vector3(0, .012, -.14), M.steel)
			cyl(g, .008, .17, Vector3(0, .012, -.255), M.steel)
			box(g, Vector3(.012, .02, .17), Vector3(0, .04, -.25), M.steel)
			box(g, Vector3(.01, .03, .015), Vector3(0, .04, -.015), M.steel, Vector3(-.4, 0, 0))
			box(g, Vector3(.032, .1, .045), Vector3(0, -.06, 0), M.wood, Vector3(-.25, 0, 0))
			g.set_meta("muzzle", Vector3(0, .012, -.345)); g.set_meta("rh", Vector3(0, -.05, 0)); g.set_meta("lh", Vector3(-.02, -.065, -.02)); g.set_meta("sy", .05)
		"knife":
			box(g, Vector3(.012, .045, .24), Vector3(0, 0, -.14), M.steel)
			box(g, Vector3(.012, .02, .06), Vector3(0, .012, -.3), M.steel, Vector3(0, 0, 0))
			box(g, Vector3(.012, .05, .012), Vector3(0, 0, -.02), M.black)
			cyl(g, .016, .11, Vector3(0, 0, .04), M.poly)
			g.set_meta("rh", Vector3(0, -.005, .045)); g.set_meta("sy", 0.0)
		"m67":
			var s := MeshInstance3D.new()
			var sm := SphereMesh.new()
			sm.radius = .036
			sm.height = .072
			s.mesh = sm
			s.material_override = M.gren
			g.add_child(s)
			cyl(g, .012, .03, Vector3(0, .04, 0), M.steel)
			box(g, Vector3(.012, .07, .006), Vector3(.028, .045, 0), M.steel, Vector3(0, 0, -.5))
			g.set_meta("rh", Vector3(0, -.03, 0)); g.set_meta("sy", 0.0)
		_:
			box(g, Vector3(.05, .07, .4), Vector3(0, 0, -.2), M.black)
			g.set_meta("muzzle", Vector3(0, 0, -.4)); g.set_meta("rh", Vector3(0, -.1, 0)); g.set_meta("lh", Vector3(0, -.03, -.3)); g.set_meta("sy", .06)
	return g

static func _try_custom(id: String) -> Node3D:
	var path := "res://models/%s.glb" % id
	if ResourceLoader.exists(path):
		var r = load(path)
		if r is PackedScene:
			return r.instantiate() as Node3D
	return null

## Gloved hands with sleeves for the first-person view.
static func add_hands(g: Node3D) -> void:
	var M := _mats()
	if g.has_meta("rh"):
		var rh: Vector3 = g.get_meta("rh")
		_glove(g, rh, -1.0)
		limb(g, rh + Vector3(0.01, 0, 0.05), rh + Vector3(0.15, -0.3, 0.5), 0.045, 0.05, M.sleeve)
	if g.has_meta("lh"):
		var lh: Vector3 = g.get_meta("lh")
		_glove(g, lh, 1.0)
		limb(g, lh + Vector3(0, 0, 0.05), lh + Vector3(-0.28, -0.28, 0.55), 0.045, 0.05, M.sleeve)

static func _glove(p: Node3D, pos: Vector3, flip: float) -> void:
	var M := _mats()
	box(p, Vector3(.08, .04, .09), pos, M.glove)
	for i in 4:
		box(p, Vector3(.016, .016, .05), pos + Vector3(-.027 + i * .018, -.018, -.06), M.glove)
	box(p, Vector3(.022, .022, .05), pos + Vector3(flip * .045, .004, -.03), M.glove)
	box(p, Vector3(.085, .05, .04), pos + Vector3(0, 0, .065), M.poly)
