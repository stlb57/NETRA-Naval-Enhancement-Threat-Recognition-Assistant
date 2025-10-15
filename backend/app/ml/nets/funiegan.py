# File: backend/app/ml/nets/funiegan.py
# --- THE ABSOLUTELY FINAL, CORRECTED VERSION ---

import torch
import torch.nn as nn

class DownBlock(nn.Module):
    def __init__(self, in_c, out_c, norm=True):
        super(DownBlock, self).__init__()
        layers = [nn.Conv2d(in_c, out_c, 4, 2, 1, bias=False)]
        if norm:
            layers.append(nn.BatchNorm2d(out_c))
        layers.append(nn.LeakyReLU(0.2))
        self.model = nn.Sequential(*layers)

    def forward(self, x):
        return self.model(x)

class UpBlock(nn.Module):
    def __init__(self, in_c, out_c):
        super(UpBlock, self).__init__()
        layers = [
            nn.ConvTranspose2d(in_c, out_c, 4, 2, 1, bias=False),
            nn.BatchNorm2d(out_c),
            nn.ReLU(inplace=True)
        ]
        self.model = nn.Sequential(*layers)

    def forward(self, x):
        return self.model(x)

class FinalUnetGenerator(nn.Module):
    def __init__(self, in_channels=3, out_channels=3):
        super(FinalUnetGenerator, self).__init__()
        
        self.down1 = DownBlock(in_channels, 32, norm=False)
        self.down2 = DownBlock(32, 128)
        self.down3 = DownBlock(128, 256)
        self.down4 = DownBlock(256, 256)
        
        # This is the line we changed. The bottleneck layer has no normalization.
        self.down5 = DownBlock(256, 256, norm=False) # <-- THE FINAL FIX IS HERE
        
        self.up1 = UpBlock(256, 256)
        self.up2 = UpBlock(512, 256)
        self.up3 = UpBlock(512, 128)
        self.up4 = UpBlock(256, 32)
        
        self.final = nn.Sequential(
            nn.Upsample(scale_factor=2),
            nn.ZeroPad2d((1, 0, 1, 0)),
            nn.Conv2d(64, out_channels, 4, padding=1),
            nn.Tanh()
        )

    def forward(self, x):
        d1 = self.down1(x)
        d2 = self.down2(d1)
        d3 = self.down3(d2)
        d4 = self.down4(d3)
        d5 = self.down5(d4)

        u1 = self.up1(d5)
        u2 = self.up2(torch.cat([u1, d4], 1))
        u3 = self.up3(torch.cat([u2, d3], 1))
        u4 = self.up4(torch.cat([u3, d2], 1))

        return self.final(torch.cat([u4, d1], 1))

def GeneratorFunieGAN():
    return FinalUnetGenerator()