#!/usr/bin/env python3
"""Build the single-file browser game.

Concatenates web/src/template.html + web/src/styles.css + web/src/js/*.js
(in numeric file-name order) into web/dist/black-order.html.

Usage:  python3 tools/build.py [--out PATH]
"""
import argparse
import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "web", "src")


def natural_key(path):
    name = os.path.basename(path)
    num = name.split("-", 1)[0]
    return (int(num) if num.isdigit() else 10**9, name)


def build():
    template = open(os.path.join(SRC, "template.html"), encoding="utf-8").read()
    css = open(os.path.join(SRC, "styles.css"), encoding="utf-8").read()
    modules = sorted(glob.glob(os.path.join(SRC, "js", "*.js")), key=natural_key)
    if not modules:
        sys.exit("No JavaScript modules found in web/src/js")
    js = "".join(open(m, encoding="utf-8").read() for m in modules)
    if "@@CSS@@" not in template or "@@JS@@" not in template:
        sys.exit("template.html is missing the @@CSS@@ or @@JS@@ placeholder")
    return template.replace("@@CSS@@", css).replace("@@JS@@", js), modules


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "web", "dist", "black-order.html"))
    args = ap.parse_args()
    html, modules = build()
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Built {os.path.relpath(args.out, ROOT)}: {len(html):,} bytes from {len(modules)} modules")


if __name__ == "__main__":
    main()
