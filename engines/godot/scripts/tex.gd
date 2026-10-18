extends RefCounted
## Procedural textures and materials (no images are needed).
## When you have your own textures, replace them in get_tex().

static var cache := {}
static var mcache := {}

static func get_tex(kind: String) -> ImageTexture:
	if cache.has(kind):
		return cache[kind]
	var img: Image
	match kind:
		"plaster": img = _tint(128, Color(0.84, 0.79, 0.69), Color(0.62, 0.57, 0.47), 0.05, 7, 0.03)
		"brick": img = _brick(128)
		"roof": img = _roof(128)
		"wood": img = _wood(128)
		"ground": img = _tint(128, Color(0.62, 0.62, 0.6), Color(1.0, 1.0, 0.97), 0.045, 3, 0.05)
		"rock": img = _tint(128, Color(0.35, 0.34, 0.32), Color(0.78, 0.76, 0.72), 0.035, 5, 0.04)
		"leaf": img = _tint(128, Color(0.18, 0.34, 0.12), Color(0.44, 0.64, 0.26), 0.12, 9, 0.06)
		"bark": img = _tint(128, Color(0.17, 0.12, 0.08), Color(0.42, 0.32, 0.22), 0.08, 11, 0.04)
		"rust": img = _tint(128, Color(0.14, 0.1, 0.08), Color(0.46, 0.25, 0.12), 0.07, 13, 0.05)
		"sand": img = _tint(128, Color(0.42, 0.37, 0.27), Color(0.67, 0.6, 0.45), 0.09, 15, 0.05)
		"concrete": img = _tint(128, Color(0.4, 0.4, 0.38), Color(0.62, 0.61, 0.58), 0.06, 17, 0.05)
		"camo_wood": img = _camo(128, [Color(0.12, 0.15, 0.09), Color(0.27, 0.32, 0.18), Color(0.4, 0.4, 0.26), Color(0.19, 0.22, 0.12)], 1)
		"camo_digi": img = _camo(128, [Color(0.16, 0.2, 0.13), Color(0.3, 0.36, 0.21), Color(0.48, 0.47, 0.32), Color(0.65, 0.58, 0.44)], 6)
		"camo_tan": img = _camo(128, [Color(0.42, 0.35, 0.24), Color(0.58, 0.5, 0.36), Color(0.72, 0.64, 0.5), Color(0.34, 0.29, 0.2)], 6)
		"chain": img = _chain(64)
		"gunmetal": img = _tint(64, Color(0.12, 0.12, 0.13), Color(0.3, 0.31, 0.32), 0.1, 19, 0.05)
		_: img = _tint(64, Color(0.5, 0.5, 0.5), Color(0.8, 0.8, 0.8), 0.05, 1, 0.0)
	var t := ImageTexture.create_from_image(img)
	cache[kind] = t
	return t

static func _tint(size: int, c1: Color, c2: Color, freq: float, sd: int, speck: float) -> Image:
	var n := FastNoiseLite.new()
	n.seed = sd
	n.frequency = freq
	n.fractal_octaves = 4
	var b := n.get_seamless_image(size, size)
	var img := Image.create(size, size, true, Image.FORMAT_RGBA8)
	var rg := RandomNumberGenerator.new()
	rg.seed = sd
	for y in size:
		for x in size:
			var t: float = b.get_pixel(x, y).r
			var c := c1.lerp(c2, t)
			if speck > 0.0:
				var s := rg.randf_range(-speck, speck)
				c = Color(c.r + s, c.g + s, c.b + s)
			img.set_pixel(x, y, c)
	img.generate_mipmaps()
	return img

static func _brick(size: int) -> Image:
	var img := Image.create(size, size, true, Image.FORMAT_RGBA8)
	img.fill(Color(0.42, 0.39, 0.36))
	var rg := RandomNumberGenerator.new()
	rg.seed = 21
	var full := Rect2i(0, 0, size, size)
	for r in size / 16:
		var off := (r % 2) * 16
		for c in range(-1, size / 32 + 1):
			var v := rg.randf_range(0.0, 1.0)
			img.fill_rect(Rect2i(c * 32 + off + 1, r * 16 + 1, 30, 14).intersection(full),
				Color(0.5 + v * 0.18, 0.22 + v * 0.07, 0.16 + v * 0.05))
	img.generate_mipmaps()
	return img

static func _roof(size: int) -> Image:
	var img := Image.create(size, size, true, Image.FORMAT_RGBA8)
	var rg := RandomNumberGenerator.new()
	rg.seed = 23
	var full := Rect2i(0, 0, size, size)
	for r in size / 16:
		var off := (r % 2) * 8
		for c in range(-1, size / 16 + 1):
			var v := rg.randf_range(0.0, 1.0)
			var col := Color(0.42 + v * 0.14, 0.17 + v * 0.06, 0.12 + v * 0.04)
			img.fill_rect(Rect2i(c * 16 + off, r * 16, 15, 14).intersection(full), col)
			img.fill_rect(Rect2i(c * 16 + off, r * 16 + 14, 15, 2).intersection(full), col * 0.55)
	img.generate_mipmaps()
	return img

static func _wood(size: int) -> Image:
	var img := _tint(size, Color(0.28, 0.18, 0.1), Color(0.5, 0.34, 0.2), 0.03, 25, 0.03)
	for i in range(0, size, 16):
		img.fill_rect(Rect2i(i, 0, 1, size), Color(0.08, 0.05, 0.03))
	img.generate_mipmaps()
	return img

static func _camo(size: int, pal: Array, block: int) -> Image:
	var n := FastNoiseLite.new()
	n.seed = 31 + block
	n.frequency = 0.035 if block == 1 else 0.05
	n.fractal_octaves = 3
	var b := n.get_seamless_image(size, size)
	var img := Image.create(size, size, true, Image.FORMAT_RGBA8)
	for y in range(0, size, block):
		for x in range(0, size, block):
			var t: float = b.get_pixel(x, y).r
			var c: Color = pal[0] if t < 0.36 else (pal[1] if t < 0.5 else (pal[2] if t < 0.64 else pal[3]))
			img.fill_rect(Rect2i(x, y, block, block), c)
	img.generate_mipmaps()
	return img

static func _chain(size: int) -> Image:
	var img := Image.create(size, size, true, Image.FORMAT_RGBA8)
	for y in size:
		for x in size:
			if posmod(x + y, 8) < 1 or posmod(x - y, 8) < 1:
				img.set_pixel(x, y, Color(0.6, 0.62, 0.6, 1.0))
			else:
				img.set_pixel(x, y, Color(0, 0, 0, 0))
	img.generate_mipmaps()
	return img

## Soldier face (kind 0 beard, 1 clean-shaven, 2 balaclava, 3 goggles). The texture is wrapped around the head sphere.
static func face(kind: int) -> ImageTexture:
	var key := "face%d" % kind
	if cache.has(key):
		return cache[key]
	var skins := [Color(0.73, 0.54, 0.4), Color(0.56, 0.39, 0.27), Color(0.79, 0.63, 0.51), Color(0.48, 0.32, 0.22)]
	var sk: Color = skins[kind % 4]
	var img := Image.create(128, 64, true, Image.FORMAT_RGBA8)
	img.fill(Color(0.1, 0.08, 0.06))
	img.fill_rect(Rect2i(34, 6, 60, 52), sk)
	img.fill_rect(Rect2i(30, 20, 68, 16), sk)
	for s in [-1, 1]:
		var ex: int = 64 + s * 14
		img.fill_rect(Rect2i(ex - 6, 26, 12, 5), Color(0.9, 0.88, 0.82))
		img.fill_rect(Rect2i(ex - 2, 26, 4, 5), Color(0.1, 0.07, 0.05))
		img.fill_rect(Rect2i(ex - 7, 22, 14, 2), Color(0.1, 0.07, 0.05))
	img.fill_rect(Rect2i(62, 32, 4, 8), sk * 0.85)
	img.fill_rect(Rect2i(56, 46, 16, 2), Color(0.45, 0.2, 0.17))
	if kind == 0:
		img.fill_rect(Rect2i(38, 40, 52, 16), Color(0.1, 0.08, 0.06))
		img.fill_rect(Rect2i(56, 46, 16, 2), Color(0.45, 0.2, 0.17))
	elif kind == 2:
		img.fill(Color(0.08, 0.08, 0.09))
		img.fill_rect(Rect2i(40, 21, 48, 12), sk)
		img.fill_rect(Rect2i(50, 26, 8, 4), Color(0.9, 0.88, 0.82))
		img.fill_rect(Rect2i(70, 26, 8, 4), Color(0.9, 0.88, 0.82))
	elif kind == 3:
		img.fill_rect(Rect2i(44, 21, 20, 12), Color(0.1, 0.1, 0.12))
		img.fill_rect(Rect2i(64, 21, 20, 12), Color(0.1, 0.1, 0.12))
		img.fill_rect(Rect2i(46, 23, 16, 8), Color(0.6, 0.7, 0.75))
		img.fill_rect(Rect2i(66, 23, 16, 8), Color(0.6, 0.7, 0.75))
	img.generate_mipmaps()
	var t := ImageTexture.create_from_image(img)
	cache[key] = t
	return t

static func soft_circle() -> GradientTexture2D:
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	var t := GradientTexture2D.new()
	t.gradient = g
	t.fill = GradientTexture2D.FILL_RADIAL
	t.fill_from = Vector2(0.5, 0.5)
	t.fill_to = Vector2(1.0, 0.5)
	t.width = 128
	t.height = 128
	return t

## Material with a texture mapped by world coordinates (without stretching).
static func mat(kind: String, scale: float = 0.3, tint: Color = Color.WHITE, rough: float = 0.9, metal: float = 0.0) -> StandardMaterial3D:
	var key := "%s_%s_%s_%s_%s" % [kind, scale, tint.to_html(), rough, metal]
	if mcache.has(key):
		return mcache[key]
	var m := StandardMaterial3D.new()
	m.albedo_texture = get_tex(kind)
	m.albedo_color = tint
	m.roughness = rough
	m.metallic = metal
	m.uv1_triplanar = true
	m.uv1_world_triplanar = true
	m.uv1_scale = Vector3(scale, scale, scale)
	mcache[key] = m
	return m

static func plain(color: Color, rough: float = 0.8, metal: float = 0.0) -> StandardMaterial3D:
	var key := "plain_%s_%s_%s" % [color.to_html(), rough, metal]
	if mcache.has(key):
		return mcache[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	m.metallic = metal
	mcache[key] = m
	return m

static func chain_mat() -> StandardMaterial3D:
	if mcache.has("chain"):
		return mcache["chain"]
	var m := StandardMaterial3D.new()
	m.albedo_texture = get_tex("chain")
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	m.alpha_scissor_threshold = 0.5
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.uv1_scale = Vector3(30, 9, 1)
	m.roughness = 0.5
	m.metallic = 0.6
	mcache["chain"] = m
	return m
