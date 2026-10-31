// Recorte da pessoa com o Vision do macOS (roda no seu Mac, sem internet e sem modelo para baixar).
// Chamado por scripts/preparar-video.mjs; não precisa rodar à mão.
// Uso: recortar <pasta-jpg>  →  escreve na saída padrão um PNG por quadro, com o alfa = pessoa.
// A máscara é suavizada na borda (desfoque 1,5 px) e no tempo (média 1-2-1 com o quadro anterior e
// o seguinte) para o contorno não tremer. O ffmpeg lê isso e grava o recorte.webm.
import Foundation
import Vision
import CoreImage
import ImageIO

let a = CommandLine.arguments
guard a.count >= 2 else { FileHandle.standardError.write("uso: recortar <pasta-jpg>\n".data(using: .utf8)!); exit(1) }
let entrada = a[1]
let arquivos = try FileManager.default.contentsOfDirectory(atPath: entrada).filter { $0.hasSuffix(".jpg") }.sorted()
let pedido = VNGeneratePersonSegmentationRequest()
pedido.qualityLevel = .accurate
pedido.outputPixelFormat = kCVPixelFormatType_OneComponent8
let ctx = CIContext(options: [.workingColorSpace: NSNull()])
let rgb = CGColorSpaceCreateDeviceRGB()
let cinza = CGColorSpaceCreateDeviceGray()
let saida = FileHandle.standardOutput

func carregar(_ f: String) throws -> (CIImage, [UInt8]) {
    let url = URL(fileURLWithPath: entrada + "/" + f)
    let img = CIImage(contentsOf: url)!
    try VNImageRequestHandler(url: url).perform([pedido])
    let w = Int(img.extent.width), h = Int(img.extent.height)
    var bytes = [UInt8](repeating: 0, count: w * h)
    if let buf = pedido.results?.first?.pixelBuffer {
        var m = CIImage(cvPixelBuffer: buf)
        m = m.transformed(by: CGAffineTransform(scaleX: img.extent.width / m.extent.width, y: img.extent.height / m.extent.height))
        m = m.clampedToExtent().applyingGaussianBlur(sigma: 1.5).cropped(to: img.extent)
        ctx.render(m, toBitmap: &bytes, rowBytes: w, bounds: img.extent, format: .L8, colorSpace: cinza)
    }
    return (img, bytes)
}

// janela de 3 quadros (anterior, atual, seguinte): memória constante em vídeo longo
func escrever(_ img: CIImage, _ a0: [UInt8], _ a1: [UInt8], _ a2: [UInt8]) {
    let w = Int(img.extent.width), h = Int(img.extent.height)
    var px = [UInt8](repeating: 0, count: w * h * 4)
    ctx.render(img, toBitmap: &px, rowBytes: w * 4, bounds: img.extent, format: .RGBA8, colorSpace: rgb)
    for k in 0..<(w * h) { px[k * 4 + 3] = UInt8((Int(a0[k]) + 2 * Int(a1[k]) + Int(a2[k])) / 4) }
    // PNG em sequência pela saída padrão (o ffmpeg do Remotion lê image2pipe; não lê RGBA cru)
    let cg = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4, space: rgb,
                     bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue), provider: CGDataProvider(data: Data(px) as CFData)!,
                     decode: nil, shouldInterpolate: false, intent: .defaultIntent)!
    let dados = NSMutableData()
    let destino = CGImageDestinationCreateWithData(dados, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(destino, cg, [kCGImageDestinationLossyCompressionQuality: 1.0] as CFDictionary)
    CGImageDestinationFinalize(destino)
    saida.write(dados as Data)
}
guard !arquivos.isEmpty else { exit(0) }
var atual = try carregar(arquivos[0])
var anterior = atual.1
for i in 0..<arquivos.count {
    let seguinte = i + 1 < arquivos.count ? try carregar(arquivos[i + 1]) : atual
    escrever(atual.0, anterior, atual.1, seguinte.1)
    anterior = atual.1
    atual = seguinte
    if (i + 1) % 60 == 0 { FileHandle.standardError.write("  recorte: \(i + 1) / \(arquivos.count)\n".data(using: .utf8)!) }
}
