class MockSlide {
  addText() {}
  addImage() {}
  addShape() {}
}

class PptxGenJS {
  constructor() {
    this.title = '';
    this._slides = [];
  }

  addSlide() {
    const slide = new MockSlide();
    this._slides.push(slide);
    return slide;
  }

  write() {
    return Buffer.from('pptx');
  }
}

module.exports = PptxGenJS;
module.exports.default = PptxGenJS;
