#!/usr/bin/env python3
"""Original pixel-art brawler export; deterministic, no legacy assets.
Requires Pillow. Writes a 9x4 32x48 spritesheet + editable OpenRaster source.
Art remains a review candidate until approved.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from xml.etree.ElementTree import Element, SubElement, tostring
import io, json, zipfile

ROOT = Path(__file__).resolve().parent.parent
FW, FH = 32, 48
PALETTE = {
    'outline':'#182333','hair':'#19252d','hairlight':'#394451',
    'skin':'#bd856e','skinlight':'#dfa58a','skinshadow':'#955d50',
    'coat':'#4d4a49','coatlight':'#6d6560','coatshadow':'#313a3e',
    'shirt':'#a44d32','shirtlight':'#d07142','pants':'#2d3946',
    'shoes':'#9ca7a5','gauntlet':'#ec843d','glow':'#ffcb69','spark':'#fff0a8',
}
def draw_frame(direction, frame):
    im = Image.new('RGBA', (FW, FH))
    d = ImageDraw.Draw(im)
    def rect(xy, key): d.rectangle(xy, fill=PALETTE.get(key, key))
    state = 'idle' if frame == 0 else 'walk' if frame < 5 else 'attack' if frame < 8 else 'hurt'
    phase = frame-1 if state == 'walk' else frame-5 if state == 'attack' else 0
    bob = [0,1,0,-1][phase] if state == 'walk' else 0
    sx = 0 if direction in ('south','north') else (-2 if direction == 'west' else 2)
    leg = [-1,0,1,0][phase] if state == 'walk' else 0
    rect((7,41,24,43),'#0d1b2990')
    rect((8+leg,31+bob,14+leg,41+bob),'pants')
    rect((18-leg,31+bob,24-leg,41+bob),'pants')
    rect((7+leg,40+bob,15+leg,43+bob),'shoes')
    rect((17-leg,40+bob,25-leg,43+bob),'shoes')
    rect((5+sx,17+bob,26+sx,33+bob),'outline')
    rect((7+sx,18+bob,24+sx,31+bob),'coat')
    rect((10+sx,18+bob,20+sx,29+bob),'shirt')
    rect((13+sx,19+bob,17+sx,27+bob),'shirtlight')
    rect((7+sx,18+bob,10+sx,30+bob),'coatlight')
    rect((21+sx,19+bob,24+sx,30+bob),'coatshadow')
    if direction == 'west': arm=(1,22+bob,7,33+bob)
    elif direction == 'east': arm=(25,22+bob,31,33+bob)
    else: arm=(23,23+bob,29,33+bob)
    rect(arm,'gauntlet')
    rect((arm[0]+1,arm[1]+1,arm[2]-1,arm[1]+3),'glow')
    rect((arm[0]+1,arm[3]-3,arm[2]-1,arm[3]-2),'coatshadow')
    rect((3,21+bob,7,31+bob),'coatshadow')
    rect((5+sx,8+bob,26+sx,20+bob),'hair')
    rect((7+sx,10+bob,24+sx,19+bob),'skin')
    rect((8+sx,10+bob,22+sx,12+bob),'skinlight')
    rect((5+sx,6+bob,26+sx,12+bob),'hair')
    rect((8+sx,5+bob,22+sx,7+bob),'hairlight')
    if direction == 'south':
        rect((11,14+bob,13,15+bob),'outline')
        rect((19,14+bob,21,15+bob),'outline')
        rect((12,18+bob,20,18+bob),'skinshadow')
    elif direction == 'west':
        rect((7,14+bob,9,15+bob),'outline')
        rect((6,17+bob,9,17+bob),'skinshadow')
    elif direction == 'east':
        rect((22,14+bob,24,15+bob),'outline')
        rect((22,17+bob,25,17+bob),'skinshadow')
    else:
        rect((8,12+bob,24,16+bob),'hair')
        rect((9,12+bob,22,13+bob),'hairlight')
    if state == 'attack':
        ext=[2,8,4][phase]
        gx=25+ext if direction != 'west' else max(0,7-ext)
        gy=22 if phase != 1 else 17
        rect((max(0,gx-3),gy,min(31,gx+2),gy+6),'gauntlet')
        rect((max(0,gx-2),gy+1,min(31,gx+1),gy+3),'glow')
        if phase == 1:
            for px,py in ((3,15),(27,10),(25,28),(12,3)):
                rect((px,py,px+2,py+2),'spark')
        elif phase == 2: rect((24,18,27,22),'glow')
    if state == 'hurt':
        rect((4,15,28,16),'#ff6672')
        rect((6,14,9,14),'spark')
    return im

def main():
    sheet = Image.new('RGBA',(FW*9,FH*4))
    faces=('south','west','east','north')
    for row,face in enumerate(faces):
        for frame in range(9): sheet.alpha_composite(draw_frame(face,frame),(frame*FW,row*FH))
    png=io.BytesIO()
    sheet.save(png,format='PNG',optimize=True)
    image=png.getvalue()
    metadata={
        'id':'CHAR-02','creator':'Original Rebirth pixel-art implementation',
        'sourceFile':'art/rebirth/source/fire-brawler-character.ora','created':'2026-10-19',
        'frameWidth':32,'frameHeight':48,'columns':9,'rows':4,
        'animations':{face:{'idle':[row*9],
            'walk':[row*9+i for i in range(1,5)],
            'attack':[row*9+i for i in range(5,8)],
            'hurt':[row*9+8]} for row,face in enumerate(faces)},
        'feetAnchor':{'x':16,'y':43},'collisionFootprint':{'width':17,'height':10},
        'approved':False,'reviewStatus':'ORIGINAL_CANDIDATE_NEEDS_VISUAL_QA',
        'revision':'1',
        'productionNotes':'Original brawler with orange energized gauntlet, four directions and distinct action frames.',
    }
    xml=Element('image',{'w':str(sheet.width),'h':str(sheet.height),
        'name':'Rebirth Fire Brawler','version':'0.0.3'})
    stack=SubElement(xml,'stack')
    SubElement(stack,'layer',{'name':'Character and frames','src':'data/layer0.png',
        'opacity':'1.0','visibility':'visible','composite-op':'svg:src-over','x':'0','y':'0'})
    source=io.BytesIO()
    with zipfile.ZipFile(source,'w') as z:
        z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
        z.writestr('stack.xml',tostring(xml,encoding='utf-8'))
        z.writestr('data/layer0.png',image)
        z.writestr('mergedimage.png',image)
    files={
        'public/rebirth/art/fire-brawler-character.png':image,
        'public/rebirth/art/fire-brawler-character.json':(
            json.dumps(metadata,ensure_ascii=False,indent=2)+'\n').encode(),
        'art/rebirth/source/fire-brawler-character.ora':source.getvalue(),
    }
    for name,data in files.items():
        target=ROOT/name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(data)
        print(name,len(data))
if __name__ == '__main__': main()
