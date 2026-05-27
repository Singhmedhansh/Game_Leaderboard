from pathlib import Path
from pypdf import PdfReader
pdf = Path(r'C:\Users\singh\Downloads\FreeFire Leader board\FREE FIRE REGISTATION FORM (Responses) - Form Responses 1.pdf')
reader = PdfReader(str(pdf))
print('pages', len(reader.pages))
for i, page in enumerate(reader.pages, 1):
    text = page.extract_text() or ''
    print(f'\n--- PAGE {i} ---')
    print(text[:12000])
