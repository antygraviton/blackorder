extends Node
## Autoload "Game": weapon and mission data, progress saving, input and sounds.

const SAVE_PATH := "user://profile_v1.json"

# cat: primary / secondary / melee / grenade. spread is in angular degrees.
const WEAPONS := {
	"hk416": {"name": "HK416 (desert)", "cat": "primary", "dmg": 24.0, "rate": 0.085, "mag": 30, "res": 150, "auto": true, "spread": 0.6, "price": 0, "zoom": 1.3},
	"ak": {"name": "AK-74M", "cat": "primary", "dmg": 27.0, "rate": 0.1, "mag": 30, "res": 150, "auto": true, "spread": 0.8, "price": 0, "zoom": 1.2},
	"mp5": {"name": "MP5 submachine gun", "cat": "primary", "dmg": 19.0, "rate": 0.07, "mag": 30, "res": 180, "auto": true, "spread": 1.2, "price": 80, "zoom": 1.15},
	"shotgun": {"name": "Remington 870", "cat": "primary", "dmg": 15.0, "pellets": 8, "rate": 0.85, "mag": 6, "res": 36, "auto": false, "spread": 2.6, "price": 120, "zoom": 1.1, "rel": 2.2},
	"svd": {"name": "SVD sniper rifle", "cat": "primary", "dmg": 95.0, "rate": 0.9, "mag": 10, "res": 40, "auto": false, "spread": 0.1, "price": 0, "medals": 50, "zoom": 3.2, "scoped": true},
	"glock": {"name": "Glock 17", "cat": "secondary", "dmg": 22.0, "rate": 0.2, "mag": 17, "res": 85, "auto": false, "spread": 1.2, "price": 0, "zoom": 1.1},
	"revolver": {"name": "Colt Python", "cat": "secondary", "dmg": 62.0, "rate": 0.6, "mag": 6, "res": 36, "auto": false, "spread": 0.25, "price": 60, "zoom": 1.1, "rel": 2.4},
	"knife": {"name": "Combat knife", "cat": "melee", "dmg": 70.0, "rate": 0.45, "melee": true, "price": 0},
	"m67": {"name": "M67 grenade", "cat": "grenade", "price": 0},
}

const SOON := {
	"primary": ["Normal", "RPG", "Luk", "Banana gun", "Bajonet"],
	"secondary": ["Napalm", "Hardbass", "Double pistol"],
	"melee": ["Crossbow", "Machete", "Kladivo", "Riot shield"],
	"grenade": ["Dynamit", "Smoke grenade", "Flashbang"],
}

# Missions: same values as in the browser prototype.
var LEVELS: Array = [
	{"n": "The Vanished Village", "txt": "The year is 2015. A mountain village has stopped broadcasting. Investigate it.", "en": 12, "mines": 8, "kits": 3, "houses": 10, "ruins": 2, "seed": 11,
	 "reward": 150, "medals": 20, "xp": 60, "acc": 0.5, "hp": 60.0,
	 "grass": Color(0.37, 0.49, 0.23), "dirt": Color(0.49, 0.43, 0.3), "road": Color(0.43, 0.38, 0.28), "rock": Color(0.5, 0.48, 0.45), "rock2": Color(0.64, 0.61, 0.57),
	 "sky_top": Color(0.31, 0.53, 0.81), "sky_hor": Color(0.83, 0.89, 0.93), "fog": Color(0.74, 0.8, 0.85), "fog_d": 0.0012, "sun_dir": Vector3(0.55, 0.7, 0.35), "sun_i": 1.5, "sun_c": Color(1, 0.95, 0.84), "amb": 0.9},
	{"n": "Base Infiltration", "txt": "An encrypted map leads to an abandoned mine. The Order has taken it over.", "en": 18, "mines": 14, "kits": 3, "houses": 13, "ruins": 4, "seed": 23,
	 "reward": 250, "medals": 30, "xp": 90, "acc": 0.6, "hp": 70.0,
	 "grass": Color(0.49, 0.49, 0.29), "dirt": Color(0.57, 0.5, 0.35), "road": Color(0.48, 0.42, 0.33), "rock": Color(0.56, 0.54, 0.5), "rock2": Color(0.74, 0.7, 0.61),
	 "sky_top": Color(0.49, 0.55, 0.6), "sky_hor": Color(0.73, 0.75, 0.76), "fog": Color(0.67, 0.69, 0.7), "fog_d": 0.002, "sun_dir": Vector3(0.4, 0.55, 0.5), "sun_i": 0.9, "sun_c": Color(0.91, 0.89, 0.83), "amb": 1.2},
	{"n": "City Under Fire", "txt": "The Order holds a small town on the border. Evening, fog, mines in the streets.", "en": 24, "mines": 20, "kits": 4, "houses": 15, "ruins": 8, "seed": 37,
	 "reward": 400, "medals": 40, "xp": 120, "acc": 0.7, "hp": 80.0,
	 "grass": Color(0.33, 0.36, 0.23), "dirt": Color(0.38, 0.31, 0.24), "road": Color(0.28, 0.25, 0.23), "rock": Color(0.4, 0.38, 0.35), "rock2": Color(0.52, 0.44, 0.36),
	 "sky_top": Color(0.21, 0.27, 0.42), "sky_hor": Color(0.9, 0.54, 0.35), "fog": Color(0.65, 0.44, 0.35), "fog_d": 0.003, "sun_dir": Vector3(-0.75, 0.28, 0.45), "sun_i": 1.7, "sun_c": Color(1, 0.6, 0.33), "amb": 0.7},
]

var current_level := 0
var S := {}
var _players: Array = []
var _snd := {}

func default_profile() -> Dictionary:
	return {"name": "PLAYER", "xp": 0, "wp": 0, "medals": 0, "kills": 0, "missions": 0, "deaths": 0, "max_level": 0,
		"owned": {"hk416": true, "ak": true, "glock": true, "knife": true, "m67": true},
		"primary": "hk416", "secondary": "glock", "vol": 0.6, "sens": 0.5, "fov": 80.0}

func _ready() -> void:
	load_profile()
	_setup_input()
	for i in 8:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)

func level_of_player() -> int:
	return 1 + int(S.xp / 100)

# ---------- saving ----------
func load_profile() -> void:
	S = default_profile()
	if FileAccess.file_exists(SAVE_PATH):
		var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
		var data = JSON.parse_string(f.get_as_text())
		if data is Dictionary:
			for k in data:
				S[k] = data[k]

func save_profile() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(S))

func reset_profile() -> void:
	S = default_profile()
	save_profile()

# ---------- store ----------
func buy(id: String) -> bool:
	var w: Dictionary = WEAPONS[id]
	if S.owned.has(id):
		return false
	if w.has("medals"):
		if S.medals < w.medals:
			return false
		S.medals -= w.medals
	else:
		if S.wp < w.price:
			return false
		S.wp -= w.price
	S.owned[id] = true
	save_profile()
	return true

func equip(id: String) -> void:
	var cat: String = WEAPONS[id].cat
	if S.owned.has(id) and (cat == "primary" or cat == "secondary"):
		S[cat] = id
		save_profile()

# ---------- input ----------
func _setup_input() -> void:
	var keys := {
		"move_forward": KEY_W, "move_back": KEY_S, "move_left": KEY_A, "move_right": KEY_D,
		"jump": KEY_SPACE, "sprint": KEY_SHIFT, "reload": KEY_R,
		"slot1": KEY_1, "slot2": KEY_2, "slot3": KEY_3, "slot4": KEY_4, "pause": KEY_ESCAPE,
	}
	for a in keys:
		if not InputMap.has_action(a):
			InputMap.add_action(a)
		var e := InputEventKey.new()
		e.physical_keycode = keys[a]
		InputMap.action_add_event(a, e)
	var mouse := {"fire": MOUSE_BUTTON_LEFT, "aim": MOUSE_BUTTON_RIGHT}
	for a in mouse:
		if not InputMap.has_action(a):
			InputMap.add_action(a)
		var e := InputEventMouseButton.new()
		e.button_index = mouse[a]
		InputMap.action_add_event(a, e)

# ---------- sounds (generated, no files) ----------
func _wav(freq: float, dur: float, noise_mix: float, decay: float) -> AudioStreamWAV:
	var n := int(44100.0 * dur)
	var data := PackedByteArray()
	data.resize(n * 2)
	var rg := RandomNumberGenerator.new()
	rg.seed = int(freq * 7.0 + dur * 1000.0)
	for i in n:
		var t := float(i) / 44100.0
		var env := pow(1.0 - float(i) / n, decay)
		var tone := signf(sin(TAU * freq * t)) * 0.5
		var v := (tone * (1.0 - noise_mix) + rg.randf_range(-1.0, 1.0) * noise_mix) * env
		data.encode_s16(i * 2, int(clampf(v, -1.0, 1.0) * 30000.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = 44100
	w.data = data
	return w

func sfx(kind: String, vol: float = 1.0) -> void:
	if S.get("vol", 0.6) <= 0.0:
		return
	if not _snd.has(kind):
		match kind:
			"rifle": _snd[kind] = _wav(150.0, 0.13, 0.7, 3.0)
			"heavy": _snd[kind] = _wav(80.0, 0.3, 0.6, 2.5)
			"pistol": _snd[kind] = _wav(230.0, 0.1, 0.6, 3.0)
			"enemy": _snd[kind] = _wav(120.0, 0.1, 0.7, 3.0)
			"reload": _snd[kind] = _wav(500.0, 0.06, 0.2, 2.0)
			"hit": _snd[kind] = _wav(900.0, 0.04, 0.1, 2.0)
			"kill": _snd[kind] = _wav(300.0, 0.14, 0.2, 2.0)
			"boom": _snd[kind] = _wav(45.0, 0.8, 0.6, 2.0)
			"hurt": _snd[kind] = _wav(110.0, 0.18, 0.5, 2.0)
			"beep": _snd[kind] = _wav(900.0, 0.05, 0.0, 1.0)
			"kit": _snd[kind] = _wav(600.0, 0.15, 0.0, 1.5)
			"knife": _snd[kind] = _wav(500.0, 0.09, 0.5, 2.0)
			_: _snd[kind] = _wav(400.0, 0.05, 0.0, 1.0)
	var p: AudioStreamPlayer = _players[0]
	for q in _players:
		if not q.playing:
			p = q
			break
	p.stream = _snd[kind]
	p.volume_db = linear_to_db(maxf(0.001, S.get("vol", 0.6) * vol))
	p.play()

# ---------- custom 3D models ----------
## If res://models/<name>.glb exists, it is used instead of the generated boxes.
func try_model(path: String) -> Node3D:
	if ResourceLoader.exists(path):
		var r = load(path)
		if r is PackedScene:
			return r.instantiate() as Node3D
	return null
