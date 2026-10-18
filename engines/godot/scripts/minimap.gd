extends Control
## Circular minimap: buildings, medkits and enemies within 50 m. Mines are not shown.

var mission

func _draw() -> void:
	if mission == null or mission.player == null:
		return
	var c := size * 0.5
	var radius := minf(size.x, size.y) * 0.5
	draw_circle(c, radius, Color(0.04, 0.06, 0.05, 0.55))
	var p = mission.player
	var s := radius / 50.0
	var pp := Vector2(p.global_position.x, p.global_position.z)
	draw_set_transform(c, p.yaw, Vector2(s, s))
	for r in mission.map_rects:
		var rr: Rect2 = r["rect"]
		var col: Color = r["color"]
		var local := Rect2(rr.position - pp, rr.size)
		if local.position.length() < 90.0:
			draw_rect(local, col)
	for k in mission.kits:
		if not k.used:
			draw_rect(Rect2(Vector2(k.pos.x, k.pos.z) - pp - Vector2(0.8, 0.8), Vector2(1.6, 1.6)), Color(0.9, 0.9, 0.87))
	for e in mission.enemies:
		if e.alive:
			var ep := Vector2(e.global_position.x, e.global_position.z) - pp
			if ep.length() < 50.0:
				draw_circle(ep, 1.6, Color(0.84, 0.25, 0.16))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	draw_colored_polygon(PackedVector2Array([c + Vector2(0, -12), c + Vector2(8, 10), c + Vector2(0, 5), c + Vector2(-8, 10)]), Color(0.91, 0.89, 0.83))
	draw_arc(c, radius - 1.0, 0.0, TAU, 64, Color(0.91, 0.89, 0.83, 0.5), 2.0)
