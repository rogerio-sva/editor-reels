// Lê o texto de imagens com o Vision do macOS (29/10/2026, conferência dos Reels).
// Uso: ler_texto <img1> <img2> ...  →  JSON {"img": [{"t": "texto", "x":0..1, "y":0..1, "w", "h"}]} (y a partir do TOPO)
import Foundation
import Vision
import AppKit

var saida: [String: [[String: Any]]] = [:]
for caminho in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: caminho), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        saida[caminho] = []
        continue
    }
    let pedido = VNRecognizeTextRequest()
    pedido.recognitionLevel = .fast
    pedido.recognitionLanguages = ["pt-BR"]
    pedido.usesLanguageCorrection = false
    try? VNImageRequestHandler(cgImage: cg).perform([pedido])
    var achados: [[String: Any]] = []
    for r in pedido.results ?? [] {
        guard let t = r.topCandidates(1).first, t.confidence > 0.4 else { continue }
        let b = r.boundingBox
        achados.append(["t": t.string, "x": b.minX, "y": 1 - b.maxY, "w": b.width, "h": b.height])
    }
    saida[caminho] = achados
}
let dados = try JSONSerialization.data(withJSONObject: saida)
FileHandle.standardOutput.write(dados)
