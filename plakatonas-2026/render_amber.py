"""
3D scene for the Plakatonas 2026 amber poster: a piece of raw Baltic
amber on wet sand at Melnrage, Klaipeda, at sunset over the sea
(the Klaipeda beaches face west).

Rendered with Blender/Cycles (pip install bpy):
    python3 render_amber.py --width 640 --samples 32 --out test.png
"""
import argparse
import math
import random
import sys

import bpy
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("--width", type=int, default=640)
ap.add_argument("--aspect", type=float, default=1.06)   # height / width
ap.add_argument("--samples", type=int, default=32)
ap.add_argument("--out", default="amber_test.png")
ap.add_argument("--threads", type=int, default=0)
ap.add_argument("--nodof", action="store_true")
ap.add_argument("--border", type=float, nargs=4, default=None)   # xmin xmax ymin ymax (0..1)
ap.add_argument("--strip", type=int, nargs=2, default=None)       # i n: render horizontal strip i of n
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

random.seed(1252)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ------------------------------------------------------------ helpers ----
def node_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links


def link(links, a, b):
    links.new(a, b)


def new(nodes, kind, **inputs):
    n = nodes.new(kind)
    for k, v in inputs.items():
        if k in n.inputs:
            n.inputs[k].default_value = v
        else:
            setattr(n, k, v)
    return n


# --------------------------------------------------------------- world ----
world = bpy.data.worlds.new("Sunset")
scene.world = world
world.use_nodes = True
wn, wl = world.node_tree.nodes, world.node_tree.links
wn.clear()
sky = wn.new("ShaderNodeTexSky")
sky.sky_type = "MULTIPLE_SCATTERING"
SUN_ELEV = math.radians(0.9)
SUN_ROT = math.radians(-16.0)          # just out of frame, to the left
sky.sun_elevation = SUN_ELEV
sky.sun_rotation = SUN_ROT
sky.sun_disc = True
sky.sun_size = math.radians(0.8)
sky.sun_intensity = 0.6
sky.altitude = 2.0
sky.air_density = 1.0
sky.aerosol_density = 1.4
bg = wn.new("ShaderNodeBackground")
bg.inputs["Strength"].default_value = 0.22
out = wn.new("ShaderNodeOutputWorld")
wl.new(sky.outputs["Color"], bg.inputs["Color"])
wl.new(bg.outputs["Background"], out.inputs["Surface"])

# A matching sun lamp gives crisp highlights and shadows.
sun = bpy.data.lights.new("Sun", "SUN")
sun.energy = 3.0
sun.color = (1.0, 0.62, 0.34)
sun.angle = math.radians(0.8)
sun_ob = bpy.data.objects.new("Sun", sun)
scene.collection.objects.link(sun_ob)
# sky sun_rotation 0 looks down +Y; the lamp must shine back toward -Y
d = Vector((math.sin(SUN_ROT) * math.cos(SUN_ELEV),
            math.cos(SUN_ROT) * math.cos(SUN_ELEV),
            math.sin(SUN_ELEV)))
sun_ob.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()


# ---------------------------------------------------------------- sand ----
bpy.ops.mesh.primitive_plane_add(size=1)
sand = bpy.context.object
sand.name = "Sand"
sand.scale = (8, 8, 1)
sand.location = (0, 2.5, 0)
bpy.ops.object.transform_apply(scale=True)
mod = sand.modifiers.new("Sub", "SUBSURF")
mod.subdivision_type = "SIMPLE"
mod.levels = mod.render_levels = 8
tex = bpy.data.textures.new("SandLumps", "CLOUDS")
tex.noise_scale = 0.18
mod = sand.modifiers.new("Lumps", "DISPLACE")
mod.texture = tex
mod.strength = 0.012
mod.mid_level = 0.5
mod.texture_coords = "GLOBAL"

m, n, l = node_mat("WetSand")
n.clear()
o = new(n, "ShaderNodeOutputMaterial")
p = new(n, "ShaderNodeBsdfPrincipled")
p.inputs["IOR"].default_value = 1.45
coord = new(n, "ShaderNodeTexCoord")
# colour: wet quartz sand, blotchy
noise = new(n, "ShaderNodeTexNoise", **{"Scale": 9.0, "Detail": 8.0, "Roughness": 0.6})
ramp = new(n, "ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.22, 0.16, 0.10, 1)
ramp.color_ramp.elements[1].color = (0.36, 0.28, 0.19, 1)
link(l, coord.outputs["Object"], noise.inputs["Vector"])
link(l, noise.outputs["Fac"], ramp.inputs["Fac"])
# individual grains: voronoi cells, each its own tone
vor = new(n, "ShaderNodeTexVoronoi", **{"Scale": 2400.0, "Randomness": 1.0})
link(l, coord.outputs["Object"], vor.inputs["Vector"])
grain_ramp = new(n, "ShaderNodeValToRGB")
grain_ramp.color_ramp.elements[0].color = (0.55, 0.5, 0.45, 1)
grain_ramp.color_ramp.elements[1].color = (1.35, 1.25, 1.1, 1)
e = grain_ramp.color_ramp.elements.new(0.93)
e.color = (1.2, 1.12, 1.0, 1)
e = grain_ramp.color_ramp.elements.new(0.96)
e.color = (0.25, 0.22, 0.2, 1)                  # the odd dark mineral grain
sep = new(n, "ShaderNodeSeparateColor")
link(l, vor.outputs["Color"], sep.inputs["Color"])
link(l, sep.outputs["Red"], grain_ramp.inputs["Fac"])
mul = new(n, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
mul.inputs["Factor"].default_value = 1.0
link(l, ramp.outputs["Color"], mul.inputs["A"])
link(l, grain_ramp.outputs["Color"], mul.inputs["B"])
link(l, mul.outputs["Result"], p.inputs["Base Color"])
# wetness: glossier in the dips
wet = new(n, "ShaderNodeTexNoise", **{"Scale": 3.0, "Detail": 4.0})
link(l, coord.outputs["Object"], wet.inputs["Vector"])
wr = new(n, "ShaderNodeMapRange", **{"From Min": 0.35, "From Max": 0.65, "To Min": 0.62, "To Max": 0.3})
link(l, wet.outputs["Fac"], wr.inputs["Value"])
link(l, wr.outputs["Result"], p.inputs["Roughness"])
# bump: grains, plus the little ripples the backwash leaves
vd = new(n, "ShaderNodeTexVoronoi", feature="SMOOTH_F1", **{"Scale": 2400.0, "Smoothness": 0.35})
link(l, coord.outputs["Object"], vd.inputs["Vector"])
wave = new(n, "ShaderNodeTexWave", **{"Scale": 22.0, "Distortion": 6.0, "Detail": 3.0})
link(l, coord.outputs["Object"], wave.inputs["Vector"])
b1 = new(n, "ShaderNodeBump", **{"Strength": 0.55, "Distance": 0.0004})
link(l, vd.outputs["Distance"], b1.inputs["Height"])
b2 = new(n, "ShaderNodeBump", **{"Strength": 0.25, "Distance": 0.002})
link(l, wave.outputs["Fac"], b2.inputs["Height"])
link(l, b1.outputs["Normal"], b2.inputs["Normal"])
link(l, b2.outputs["Normal"], p.inputs["Normal"])
link(l, p.outputs["BSDF"], o.inputs["Surface"])
sand.data.materials.append(m)



# ------------------------------------------------ loose grains of sand ----
# Real 3D grains scattered where the lens is sharp, so the sand reads as
# sand up close: mostly quartz, some darker rock, a little pink feldspar.
grain_col = bpy.data.collections.new("Grains")
kinds = [((0.62, 0.54, 0.42), 0.45, 0.15, 5), ((0.50, 0.42, 0.32), 0.5, 0.05, 4),
         ((0.20, 0.17, 0.13), 0.45, 0.0, 3), ((0.60, 0.42, 0.33), 0.5, 0.05, 2),
         ((0.80, 0.78, 0.74), 0.35, 0.3, 1)]
for i, (col, rough, trans, copies) in enumerate(kinds):
    gm, gn, gl = node_mat(f"Grain{i}")
    gp = gn["Principled BSDF"]
    gp.inputs["Base Color"].default_value = (*col, 1)
    gp.inputs["Roughness"].default_value = rough
    gp.inputs["Specular IOR Level"].default_value = 0.5 + 0.5 * trans   # quartz catches the light
    for c_ in range(copies):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0)
        g = bpy.context.object
        for v in g.data.vertices:
            v.co *= random.uniform(0.8, 1.12)
        g.scale = (1.0, random.uniform(0.7, 0.95), random.uniform(0.55, 0.8))
        bpy.ops.object.transform_apply(scale=True)
        bpy.ops.object.shade_smooth()
        g.data.materials.append(gm)
        for cl in g.users_collection:
            cl.objects.unlink(g)
        grain_col.objects.link(g)

bpy.ops.mesh.primitive_plane_add(size=1, location=(0.0, 0.01, 0.0))
patch = bpy.context.object
patch.name = "GrainPatch"
patch.scale = (0.26, 0.16, 1)
bpy.ops.object.transform_apply(scale=True, location=False)
pm = patch.modifiers.new("Sub", "SUBSURF")
pm.subdivision_type = "SIMPLE"
pm.levels = pm.render_levels = 6
pd = patch.modifiers.new("Lumps", "DISPLACE")
pd.texture = tex
pd.strength = 0.012
pd.mid_level = 0.5
pd.texture_coords = "GLOBAL"
patch.modifiers.new("Grains", "PARTICLE_SYSTEM")
ps = patch.particle_systems[0].settings
ps.type = "HAIR"
ps.use_advanced_hair = True
ps.count = 200000
ps.emit_from = "FACE"
ps.distribution = "RAND"
ps.use_even_distribution = True
ps.render_type = "COLLECTION"
ps.instance_collection = grain_col
ps.use_collection_pick_random = True
ps.particle_size = 0.00019
ps.size_random = 0.55
ps.use_rotations = True
ps.rotation_mode = "NOR"
ps.phase_factor_random = 2.0
ps.rotation_factor_random = 0.6
patch.show_instancer_for_render = False
ps.display_percentage = 1

# --------------------------------------------------- water & the sea ----
def water_material(name, depth_tint, rough):
    m, n, l = node_mat(name)
    n.clear()
    o = new(n, "ShaderNodeOutputMaterial")
    p = new(n, "ShaderNodeBsdfPrincipled")
    p.inputs["Base Color"].default_value = depth_tint
    p.inputs["Roughness"].default_value = rough
    p.inputs["IOR"].default_value = 1.333
    coord = new(n, "ShaderNodeTexCoord")
    mp = new(n, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 3.5, 1.0)       # swell runs along the shore
    link(l, coord.outputs["Object"], mp.inputs["Vector"])
    nz = new(n, "ShaderNodeTexNoise", **{"Scale": 6.0, "Detail": 10.0, "Roughness": 0.62})
    link(l, mp.outputs["Vector"], nz.inputs["Vector"])
    bump = new(n, "ShaderNodeBump", **{"Strength": 0.35, "Distance": 0.02})
    link(l, nz.outputs["Fac"], bump.inputs["Height"])
    link(l, bump.outputs["Normal"], p.inputs["Normal"])
    link(l, p.outputs["BSDF"], o.inputs["Surface"])
    return m


bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 3000 + 4.0, -0.035))
sea = bpy.context.object
sea.name = "Sea"
sea.scale = (6000, 6000, 1)
sea.data.materials.append(water_material("Sea", (0.006, 0.02, 0.025, 1), 0.04))

# a thin sheet of backwash over the sand behind the amber
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 2.1, 0.0015))
sheet = bpy.context.object
sheet.name = "Backwash"
sheet.scale = (8, 3.8, 1)
m, n, l = node_mat("Backwash")
n.clear()
o = new(n, "ShaderNodeOutputMaterial")
glass = new(n, "ShaderNodeBsdfGlass")
glass.inputs["Color"].default_value = (0.9, 0.96, 0.95, 1)
glass.inputs["Roughness"].default_value = 0.02
glass.inputs["IOR"].default_value = 1.333
coord = new(n, "ShaderNodeTexCoord")
nz = new(n, "ShaderNodeTexNoise", **{"Scale": 14.0, "Detail": 8.0})
link(l, coord.outputs["Object"], nz.inputs["Vector"])
bump = new(n, "ShaderNodeBump", **{"Strength": 0.18, "Distance": 0.004})
link(l, nz.outputs["Fac"], bump.inputs["Height"])
link(l, bump.outputs["Normal"], glass.inputs["Normal"])
# foam: a lacy band along the front edge of the water
foam = new(n, "ShaderNodeBsdfDiffuse")
foam.inputs["Color"].default_value = (0.85, 0.86, 0.84, 1)
transp = new(n, "ShaderNodeBsdfTransparent")
sep = new(n, "ShaderNodeSeparateXYZ")
link(l, coord.outputs["Object"], sep.inputs["Vector"])
edge_noise = new(n, "ShaderNodeTexNoise", **{"Scale": 3.0, "Detail": 6.0})
link(l, coord.outputs["Object"], edge_noise.inputs["Vector"])
edge = new(n, "ShaderNodeMath", operation="MULTIPLY_ADD")
edge.inputs[1].default_value = 0.06
link(l, edge_noise.outputs["Fac"], edge.inputs[0])
link(l, sep.outputs["Y"], edge.inputs[2])
# y in object space runs -0.5..0.5; the front edge is at -0.5
cut = new(n, "ShaderNodeMath", operation="GREATER_THAN")
cut.inputs[1].default_value = -0.47
link(l, edge.outputs[0], cut.inputs[0])
lace_v = new(n, "ShaderNodeTexVoronoi", **{"Scale": 55.0})
link(l, coord.outputs["Object"], lace_v.inputs["Vector"])
band = new(n, "ShaderNodeMapRange", **{"From Min": -0.47, "From Max": -0.40, "To Min": 1.0, "To Max": 0.0})
link(l, edge.outputs[0], band.inputs["Value"])
lace = new(n, "ShaderNodeMath", operation="GREATER_THAN")
link(l, lace_v.outputs["Distance"], lace.inputs[0])
lace.inputs[1].default_value = 0.22
foam_amt = new(n, "ShaderNodeMath", operation="MULTIPLY")
link(l, band.outputs["Result"], foam_amt.inputs[0])
link(l, lace.outputs[0], foam_amt.inputs[1])
mix_fw = new(n, "ShaderNodeMixShader")
link(l, foam_amt.outputs[0], mix_fw.inputs["Fac"])
link(l, glass.outputs[0], mix_fw.inputs[1])
link(l, foam.outputs[0], mix_fw.inputs[2])
mix_cut = new(n, "ShaderNodeMixShader")
link(l, cut.outputs[0], mix_cut.inputs["Fac"])
link(l, transp.outputs["BSDF"], mix_cut.inputs[1])
link(l, mix_fw.outputs["Shader"], mix_cut.inputs[2])
link(l, mix_cut.outputs["Shader"], o.inputs["Surface"])
sheet.data.materials.append(m)


# --------------------------------------------------------------- amber ----
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=6, radius=1.0)
amber = bpy.context.object
amber.name = "Amber"
amber.scale = (0.030, 0.021, 0.0135)
bpy.ops.object.transform_apply(scale=True)
t1 = bpy.data.textures.new("AmberForm", "CLOUDS")
t1.noise_scale = 0.026
t1.noise_depth = 2
d1 = amber.modifiers.new("Form", "DISPLACE")
d1.texture = t1
d1.strength = 0.0095
d1.texture_coords = "GLOBAL"
t2 = bpy.data.textures.new("AmberChips", "VORONOI")
t2.noise_scale = 0.013
d2 = amber.modifiers.new("Chips", "DISPLACE")
d2.texture = t2
d2.strength = -0.0038
d2.texture_coords = "GLOBAL"
sm = amber.modifiers.new("Smooth", "SMOOTH")
sm.factor = 0.6
sm.iterations = 2
bpy.ops.object.shade_smooth()
amber.location = (0.0, 0.0, 0.0082)
amber.rotation_euler = (math.radians(4), math.radians(-7), math.radians(28))

m, n, l = node_mat("RawAmber")
n.clear()
o = new(n, "ShaderNodeOutputMaterial")
coord = new(n, "ShaderNodeTexCoord")
pits = new(n, "ShaderNodeTexVoronoi", **{"Scale": 420.0})
link(l, coord.outputs["Object"], pits.inputs["Vector"])
bump = new(n, "ShaderNodeBump", **{"Strength": 0.25, "Distance": 0.0003})
link(l, pits.outputs["Distance"], bump.inputs["Height"])
# clear, wet resin
p = new(n, "ShaderNodeBsdfPrincipled")
p.inputs["Base Color"].default_value = (1.0, 0.82, 0.5, 1)
p.inputs["Transmission Weight"].default_value = 1.0
p.inputs["IOR"].default_value = 1.54
p.inputs["Roughness"].default_value = 0.04
p.inputs["Coat Weight"].default_value = 0.3
p.inputs["Coat Roughness"].default_value = 0.03
link(l, bump.outputs["Normal"], p.inputs["Normal"])
# weathered crust: sea-frosted, milky, still letting light through
crust = new(n, "ShaderNodeBsdfPrincipled")
crust.inputs["Base Color"].default_value = (0.95, 0.62, 0.26, 1)
crust.inputs["Transmission Weight"].default_value = 0.65
crust.inputs["IOR"].default_value = 1.54
crust.inputs["Roughness"].default_value = 0.42
crust.inputs["Subsurface Weight"].default_value = 0.35
crust.inputs["Subsurface Radius"].default_value = (0.004, 0.0022, 0.0008)
crust.inputs["Coat Weight"].default_value = 0.25
crust.inputs["Coat Roughness"].default_value = 0.08
link(l, bump.outputs["Normal"], crust.inputs["Normal"])
mask_n = new(n, "ShaderNodeTexNoise", **{"Scale": 90.0, "Detail": 7.0, "Roughness": 0.65})
link(l, coord.outputs["Object"], mask_n.inputs["Vector"])
mask = new(n, "ShaderNodeMapRange", **{"From Min": 0.46, "From Max": 0.56, "To Min": 0.0, "To Max": 1.0})
link(l, mask_n.outputs["Fac"], mask.inputs["Value"])
mix = new(n, "ShaderNodeMixShader")
link(l, mask.outputs["Result"], mix.inputs["Fac"])
link(l, p.outputs["BSDF"], mix.inputs[1])
link(l, crust.outputs["BSDF"], mix.inputs[2])
link(l, mix.outputs["Shader"], o.inputs["Surface"])
vol_a = new(n, "ShaderNodeVolumeAbsorption", **{"Density": 48.0})
vol_a.inputs["Color"].default_value = (1.0, 0.52, 0.03, 1)
vol_s = new(n, "ShaderNodeVolumeScatter", **{"Density": 0.8, "Anisotropy": 0.75})
vol_s.inputs["Color"].default_value = (1.0, 0.72, 0.3, 1)
addv = new(n, "ShaderNodeAddShader")
link(l, vol_a.outputs[0], addv.inputs[0])
link(l, vol_s.outputs[0], addv.inputs[1])
link(l, addv.outputs[0], o.inputs["Volume"])
amber.data.materials.append(m)

# air bubbles trapped in the resin
bm, bn, bl = node_mat("Bubble")
bn.clear()
bo = new(bn, "ShaderNodeOutputMaterial")
bg_ = new(bn, "ShaderNodeBsdfPrincipled")
bg_.inputs["Transmission Weight"].default_value = 1.0
bg_.inputs["IOR"].default_value = 1.0 / 1.54
bg_.inputs["Roughness"].default_value = 0.0
link(bl, bg_.outputs["BSDF"], bo.inputs["Surface"])
for i in range(26):
    r = random.uniform(0.00012, 0.0005)
    loc = (random.uniform(-0.016, 0.016), random.uniform(-0.011, 0.011),
           0.0082 + random.uniform(-0.004, 0.004))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=16, ring_count=8)
    b = bpy.context.object
    b.data.materials.append(bm)

# a couple of small crumbs of amber and a strand of seaweed nearby
for (x, y, s) in ((0.052, 0.035, 0.0045), (-0.064, 0.06, 0.0032), (0.03, -0.045, 0.0026)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=s, location=(x, y, s * 0.55))
    cb = bpy.context.object
    cb.scale = (1.0, 0.75, 0.6)
    dd = cb.modifiers.new("Form", "DISPLACE")
    dd.texture = t1
    dd.strength = s * 0.35
    dd.texture_coords = "GLOBAL"
    bpy.ops.object.shade_smooth()
    cb.data.materials.append(m)

sw_m, sw_n, sw_l = node_mat("Seaweed")
sw_n.clear()
swo = new(sw_n, "ShaderNodeOutputMaterial")
swp = new(sw_n, "ShaderNodeBsdfPrincipled")
swp.inputs["Base Color"].default_value = (0.035, 0.03, 0.012, 1)
swp.inputs["Roughness"].default_value = 0.22
swp.inputs["Subsurface Weight"].default_value = 0.2
link(sw_l, swp.outputs["BSDF"], swo.inputs["Surface"])
for k in range(3):
    cu = bpy.data.curves.new(f"weed{k}", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = random.uniform(0.0005, 0.0009)
    cu.bevel_resolution = 3
    sp = cu.splines.new("BEZIER")
    pts = 7
    sp.bezier_points.add(pts - 1)
    x0, y0 = -0.09 + k * 0.02, 0.02 + k * 0.012
    for i, bp in enumerate(sp.bezier_points):
        x = x0 + i * 0.013 + random.uniform(-0.003, 0.003)
        y = y0 + math.sin(i * 0.9 + k) * 0.009
        bp.co = (x, y, 0.0009)
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(f"Weed{k}", cu)
    scene.collection.objects.link(ob)
    ob.data.materials.append(sw_m)


# -------------------------------------------------------------- camera ----
cam = bpy.data.cameras.new("Cam")
cam.lens = 90
cam.sensor_width = 36
cam.clip_start = 0.005
cam.clip_end = 20000
cam.dof.use_dof = not args.nodof
cam.dof.aperture_fstop = 13.0
cam_ob = bpy.data.objects.new("Cam", cam)
scene.collection.objects.link(cam_ob)
cam_ob.location = (0.012, -0.30, 0.050)
target = Vector((0.004, 0.25, 0.043))       # just above the horizon line
cam_ob.rotation_euler = (target - cam_ob.location).to_track_quat("-Z", "Y").to_euler()
# focus on the face of the stone nearest the lens, as a macro photographer would
cam.dof.focus_distance = (Vector((0.0, -0.016, 0.011)) - cam_ob.location).length
scene.camera = cam_ob

# -------------------------------------------------------------- render ----
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.cycles.use_adaptive_sampling = True
scene.cycles.use_denoising = True
scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.cycles.max_bounces = 10
scene.cycles.diffuse_bounces = 2
scene.cycles.glossy_bounces = 4
scene.cycles.transmission_bounces = 10
scene.cycles.transparent_max_bounces = 8
scene.cycles.volume_bounces = 0
scene.cycles.adaptive_threshold = 0.015
scene.cycles.blur_glossy = 0.5
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
if args.threads:
    scene.render.threads_mode = "FIXED"
    scene.render.threads = args.threads
scene.render.resolution_x = args.width
scene.render.resolution_y = int(round(args.width * args.aspect))
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0.35
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_depth = "16"
scene.render.filepath = args.out
if args.strip:
    i, k = args.strip
    args.border = [0.0, 1.0, i / k, (i + 1) / k]
if args.border:
    scene.render.use_border = True
    scene.render.use_crop_to_border = True
    (scene.render.border_min_x, scene.render.border_max_x,
     scene.render.border_min_y, scene.render.border_max_y) = args.border
bpy.ops.render.render(write_still=True)
print("WROTE", args.out)
