import AppKit
import CoreImage
import Foundation

guard CommandLine.arguments.count == 3 else {
    fatalError("Usage: swift tools/generate-qr.swift URL output.png")
}
let text = CommandLine.arguments[1]
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
guard let filter = CIFilter(name: "CIQRCodeGenerator") else {
    fatalError("System QR generator is unavailable")
}
filter.setValue(Data(text.utf8), forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")
guard let image = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 12, y: 12)),
      let cgImage = CIContext().createCGImage(image, from: image.extent) else {
    fatalError("Could not generate QR image")
}
let margin = 48
let width = cgImage.width + margin * 2
let height = cgImage.height + margin * 2
guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
    isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
), let graphics = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fatalError("Could not create QR bitmap")
}
graphics.cgContext.setFillColor(NSColor.white.cgColor)
graphics.cgContext.fill(CGRect(x: 0, y: 0, width: width, height: height))
graphics.cgContext.interpolationQuality = .none
graphics.cgContext.draw(cgImage, in: CGRect(x: margin, y: margin, width: cgImage.width, height: cgImage.height))
guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Could not encode QR image")
}
try png.write(to: destination)
guard let rendered = CIImage(data: png),
      let detector = CIDetector(ofType: CIDetectorTypeQRCode, context: nil,
                                options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]),
      let decoded = detector.features(in: rendered).first as? CIQRCodeFeature,
      decoded.messageString == text else {
    fatalError("Generated QR image failed its decode check")
}
print("Verified QR code: \(text) -> \(destination.lastPathComponent)")
