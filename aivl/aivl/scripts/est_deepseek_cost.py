# -*- coding: utf-8 -*-
cases = {
    "附件上传回填(单次)": (11666, 1666),
    "附件分析+回填(单次)": (20666, 3332),
    "轻量全流程": (76665, 12663),
    "标准全流程": (223991, 47323),
    "重度全流程": (420653, 104703),
}

# 元/百万token；按缓存未命中
prices = {
    "qwen-plus": (0.8, 2.0),
    "V4-Flash空闲": (1.5, 4.5),
    "V4-Flash高峰": (3.0, 9.0),
    "V4-Pro空闲": (4.5, 13.5),
    "V4-Pro高峰": (9.0, 27.0),
}


def cost(tin, tout, pin, pout):
    return tin / 1e6 * pin + tout / 1e6 * pout


print("单价(元/百万token, 缓存未命中):")
for k, (i, o) in prices.items():
    print(f"  {k}: 输入{i} 输出{o}")
print()
hdr = ["场景", "输入token", "输出token"] + list(prices.keys())
print("\t".join(hdr))
for case, (tin, tout) in cases.items():
    cells = [case, f"{tin}", f"{tout}"]
    for pin, pout in prices.values():
        cells.append(f"{cost(tin, tout, pin, pout):.3f}")
    print("\t".join(cells))
