#!/usr/bin/env python3
"""手牌の枚数を監査するスクリプト。"""
import re

def count_tile_notation(s):
    s = s.strip()
    if not s:
        return 0
    count = 0
    i = 0
    while i < len(s):
        if s[i] in ' \t':
            i += 1; continue
        if s[i] in '東南西北白發中':
            count += 1; i += 1; continue
        if s[i].isdigit() and i + 1 < len(s) and s[i+1] in 'mps':
            count += 1; i += 2; continue
        i += 1
    return count

def count_tiles_in_hand(hand_str):
    agari_match = re.search(r'（アガリ牌[:：]\s*([^）]+)）', hand_str)
    agari_tile = agari_match.group(1).strip() if agari_match else None
    clean = re.sub(r'（アガリ牌[:：][^）]*）', '', hand_str)
    furo_parts = re.findall(r'\[(ポン|チー|明カン|暗カン)[:：]([^\]]+)\]', clean)
    hand_only = re.sub(r'\[[^\]]+\]', '', clean).strip()
    hand_only = re.sub(r'で.*$', '', hand_only)
    hand_tiles = count_tile_notation(hand_only)
    furo_tiles = 0; kan_count = 0
    for furo_type, furo_content in furo_parts:
        furo_tiles += count_tile_notation(furo_content)
        if 'カン' in furo_type: kan_count += 1
    return hand_tiles + furo_tiles, kan_count, hand_tiles, furo_tiles, agari_tile

def main():
    with open('test_cases.md', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    current_tc = None; issues = []; all_cases = []
    for i, line in enumerate(lines, 1):
        tc_match = re.match(r'^### (TC-\d+-\d+)', line)
        if tc_match: current_tc = tc_match.group(1); continue
        hand_match = re.match(r'^- 手牌(?:修正)?[:：]\s*(.*)', line.strip())
        if current_tc and hand_match:
            hand_str = hand_match.group(1).strip()
            if any(x in hand_str for x in ['15枚以上','6枚のみ','...','0mを含む']):
                all_cases.append((current_tc, i, 'SKIP', hand_str)); current_tc = None; continue
            total, kan_count, ht, ft, agari = count_tiles_in_hand(hand_str)
            expected = 14 + kan_count
            status = 'OK' if total == expected else f'NG (got {total}, expected {expected})'
            all_cases.append((current_tc, i, status, hand_str))
            if total != expected:
                issues.append({'tc': current_tc, 'line': i, 'total': total, 'expected': expected,
                    'hand_tiles': ht, 'furo_tiles': ft, 'kan_count': kan_count, 'agari': agari, 'raw': hand_str})
            current_tc = None
    print("=" * 80)
    print("全テストケースの牌枚数一覧")
    print("=" * 80)
    for tc, line, status, raw in all_cases:
        mark = "✅" if status == 'OK' else ("⏭️" if status == 'SKIP' else "❌")
        print(f"  {mark} {tc} (L{line}): {status}")
    print(f"\n{'='*80}\n問題のあるテストケース: {len(issues)}件\n{'='*80}")
    for issue in issues:
        print(f"\n  ❌ {issue['tc']} (line {issue['line']})")
        print(f"     手牌={issue['hand_tiles']}, 副露={issue['furo_tiles']}, カン={issue['kan_count']}, 合計={issue['total']}, 期待={issue['expected']}")
        print(f"     原文: {issue['raw']}")

if __name__ == '__main__':
    main()
