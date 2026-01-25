import csv
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

DISTRITOS = [
    "Lima",
    "Ancón",
    "Ate",
    "Barranco",
    "Breña",
    "Carabayllo",
    "Chaclacayo",
    "Chorrillos",
    "Cieneguilla",
    "Comas",
    "El Agustino",
    "Independencia",
    "Jesús María",
    "La Molina",
    "La Victoria",
    "Lince",
    "Los Olivos",
    "Lurigancho",
    "Lurin",
    "Magdalena del Mar",
    "Pueblo Libre",
    "Miraflores",
    "Pachacamac",
    "Pucusana",
    "Puente Piedra",
    "Punta Hermosa",
    "Punta Negra",
    "Rímac",
    "San Bartolo",
    "San Borja",
    "San Isidro",
    "San Juan de Lurigancho",
    "San Juan de Miraflores",
    "San Luis",
    "San Martín de Porres",
    "San Miguel",
    "Santa Anita",
    "Santa María del Mar",
    "Santa Rosa",
    "Santiago de Surco",
    "Surquillo",
    "Villa El Salvador",
    "Villa María del Triunfo",
]

def safe_filename(name: str) -> str:
    """
    Mantiene tildes en el nombre del archivo, pero quita caracteres inválidos en Windows.
    """
    invalid = '<>:"/\\|?*'
    s = name.strip()
    for ch in invalid:
        s = s.replace(ch, "")
    # Evita nombres vacíos o con punto final (Windows)
    s = s.strip().strip(".")
    return s if s else "distrito"

def build_query(distrito: str) -> str:
    """
    1) Ancla Perú.
    2) Encuentra el Departamento/Región Lima (preferencia: ISO3166-2 PE-LIM).
       - Si no existe PE-LIM, usa admin_level=4 name=Lima dentro de Perú.
    3) Dentro de ese Lima, busca el distrito por name exacto + admin_level=8.
    4) Consulta canchas/centros deportivos de fútbol.
    """
    return f"""
[out:json][timeout:180];

area["ISO3166-1"="PE"]["boundary"="administrative"]["admin_level"="2"]->.peru;

(
  area["ISO3166-2"="PE-LIM"]["boundary"="administrative"];
  area(area.peru)["boundary"="administrative"]["admin_level"="4"]["name"="Lima"];
)->.lima_dep;

area(area.lima_dep)["boundary"="administrative"]["admin_level"="8"]["name"="{distrito}"]->.dist;

(
  nwr["leisure"="sports_centre"](area.dist);
  nwr["leisure"="stadium"](area.dist);
  nwr["leisure"="pitch"]["sport"~"^(soccer|football|futsal)$",i](area.dist);
  nwr["sport"~"^(soccer|football|futsal)$",i]["surface"="artificial_turf"](area.dist);
);

out center tags;
"""

def fetch_overpass(query: str) -> dict:
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={"User-Agent": "MiFuturo/1.0 (contact: tu-email@example.com)"},
    )
    with urllib.request.urlopen(req, timeout=240) as resp:
        return json.loads(resp.read())

def get_lat_lon(el: dict):
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")
    if lat is None or lon is None:
        return None, None
    return float(lat), float(lon)

def build_direccion(tags: dict) -> str:
    # intenta armar dirección si existe
    if tags.get("addr:full"):
        return tags["addr:full"]
    street = tags.get("addr:street") or tags.get("addr:place")
    num = tags.get("addr:housenumber")
    if street and num:
        return f"{street} {num}"
    if street:
        return street
    return ""

def parse_elements(osm_json: dict):
    results = []
    seen = set()

    for el in osm_json.get("elements", []):
        key = (el.get("type"), el.get("id"))
        if key in seen:
            continue
        seen.add(key)

        tags = el.get("tags") or {}
        name = tags.get("name")
        if not name:
            # si no tiene nombre, lo omitimos (puedes cambiar si quieres “OSM-...”)
            continue

        lat, lon = get_lat_lon(el)
        if lat is None or lon is None:
            continue

        results.append({
            "nombre": name,                   # mantiene tildes tal cual
            "latitud": lat,
            "longitud": lon,
            "direccion": build_direccion(tags),
        })

    results.sort(key=lambda x: x["nombre"].lower())
    return results

def write_csv(path: Path, rows):
    # utf-8-sig = UTF-8 con BOM -> Excel respeta tildes/ñ
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["nombre", "latitud", "longitud", "direccion"])
        w.writeheader()
        w.writerows(rows)

def main():
    out_dir = Path("salida_lima_departamento")
    out_dir.mkdir(exist_ok=True)

    all_rows = []

    for distrito in DISTRITOS:
        print(f"\n=== {distrito} (Lima, Perú) ===")
        q = build_query(distrito)

        try:
            j = fetch_overpass(q)
        except Exception as e:
            print(f"ERROR consultando {distrito}: {e}")
            continue

        rows = parse_elements(j)
        print("Total encontrados:", len(rows))

        csv_name = f"{safe_filename(distrito)}.csv"
        write_csv(out_dir / csv_name, rows)
        print("OK ->", csv_name)

        for r in rows:
            all_rows.append({"distrito": distrito, **r})

        # para no saturar Overpass
        time.sleep(2)

    # Consolidado
    all_rows.sort(key=lambda x: (x["distrito"].lower(), x["nombre"].lower()))
    with (out_dir / "LIMA_TODOS.csv").open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["distrito", "nombre", "latitud", "longitud", "direccion"])
        w.writeheader()
        w.writerows(all_rows)

    print("\n✅ Listo. Archivos en:", out_dir.resolve())
    print("✅ Consolidado:", (out_dir / "LIMA_TODOS.csv").resolve())

if __name__ == "__main__":
    main()
