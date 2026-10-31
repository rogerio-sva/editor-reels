#!/usr/bin/env python3
"""Recorte da pessoa fora do Mac (rembg, licença MIT; roda no computador, sem internet depois de baixar o modelo).
Uso: python scripts/reel/recortar_rembg.py <pasta com quadros .jpg>  →  grava um .png com transparência por quadro.
Instale antes: pip install "rembg[cpu]"   (com placa NVIDIA: pip install "rembg[gpu]")"""
import glob, os, sys

from PIL import Image
from rembg import new_session, remove

pasta = sys.argv[1]
sessao = new_session("u2net_human_seg")
quadros = sorted(glob.glob(os.path.join(pasta, "*.jpg")))
for k, q in enumerate(quadros):
    remove(Image.open(q).convert("RGB"), session=sessao).save(q[:-4] + ".png")
    if k % 30 == 0:
        print(f"recorte: {k + 1}/{len(quadros)}", flush=True)
