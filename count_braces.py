
with open(r'c:\Users\Perfect Elect\Downloads\Cafteria Automation\postchef\app\api\video\generate\route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

open_braces = content.count('{')
close_braces = content.count('}')
open_brackets = content.count('[')
close_brackets = content.count(']')
open_parens = content.count('(')
close_parens = content.count(')')

print(f"Braces: {open_braces} open, {close_braces} close")
print(f"Brackets: {open_brackets} open, {close_brackets} close")
print(f"Parens: {open_parens} open, {close_parens} close")
