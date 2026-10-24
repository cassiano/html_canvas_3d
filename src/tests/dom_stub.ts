/// <reference lib="deno.ns" />

/**
 * A minimal, dependency-free DOM + Canvas2D + Web Audio stub used to test the
 * browser-only parts of the project under Deno.
 *
 * The stub is deliberately small: it only implements the browser APIs that the
 * project actually touches, plus a *recording* 2D context, which lets the
 * tests assert what was painted and in which order.
 *
 * Importing this module installs the globals, so every test file that touches
 * DOM-dependent modules must import it **first**:
 *
 * ```ts
 * import './dom_stub.ts'
 * import { cube } from '../primitives.ts'
 * ```
 */

/**
 * A single recorded drawing operation.
 */
export interface DrawCall {
  /** The name of the context method that was called. */
  op: string
  /** The arguments the method was called with. */
  args: unknown[]
  /** The value of `fillStyle` at the time of the call. */
  fillStyle: unknown
  /** The value of `strokeStyle` at the time of the call. */
  strokeStyle: unknown
  /** The value of `globalAlpha` at the time of the call. */
  globalAlpha: number
  /** The value of `lineWidth` at the time of the call. */
  lineWidth: number
}

/**
 * A single recorded segment of a path.
 */
export interface PathSegment {
  /** The path method that produced the segment. */
  op: string
  /** The arguments the method was called with. */
  args: number[]
}

/**
 * A colour gradient returned by the stubbed gradient factory methods.
 */
export class FakeGradient {
  /** The colour stops added to the gradient. */
  readonly stops: { offset: number; color: string }[] = []

  /**
   * Adds a colour stop to the gradient.
   *
   * @param offset - The position of the stop, within `[0, 1]`.
   * @param color - The CSS colour of the stop.
   */
  addColorStop(offset: number, color: string) {
    this.stops.push({ offset, color })
  }
}

/**
 * The metrics of a measured text run.
 */
export class FakeTextMetrics {
  /**
   * Creates a text metrics object.
   *
   * @param width - The width of the measured text, in pixels.
   */
  constructor(readonly width: number) {}
}

/**
 * A recording stand-in for the browser's `CanvasRenderingContext2D`.
 */
export class FakeCanvasRenderingContext2D {
  /** The fill colour used by the next fill operation. */
  fillStyle: unknown = '#000000'
  /** The stroke colour used by the next stroke operation. */
  strokeStyle: unknown = '#000000'
  /** The width of the next stroke, in pixels. */
  lineWidth = 1
  /** The opacity used by the next fill operation. */
  globalAlpha = 1
  /** The font used by the next text operation. */
  font = '10px sans-serif'
  /** The horizontal alignment used by the next text operation. */
  textAlign = 'start'
  /** The vertical alignment used by the next text operation. */
  textBaseline = 'alphabetic'
  /** The shape used to join the segments of the next stroke. */
  lineJoin = 'miter'
  /** The shape used to cap the ends of the next stroke. */
  lineCap = 'butt'
  /** The ratio at which miter joins are truncated. */
  miterLimit = 10
  /** The blur radius of the shadow. */
  shadowBlur = 0
  /** The colour of the shadow. */
  shadowColor = 'rgba(0, 0, 0, 0)'
  /** The horizontal offset of the shadow. */
  shadowOffsetX = 0
  /** The vertical offset of the shadow. */
  shadowOffsetY = 0
  /** The compositing operator applied to new drawings. */
  globalCompositeOperation = 'source-over'

  /** Every drawing operation recorded so far. */
  readonly calls: DrawCall[] = []
  /** The segments of the path currently being built. */
  currentPath: PathSegment[] = []
  /** Every path that was filled or stroked, in order. */
  readonly completedPaths: PathSegment[][] = []

  private saveStack: {
    fillStyle: unknown
    strokeStyle: unknown
    lineWidth: number
    globalAlpha: number
    font: string
    textAlign: string
    textBaseline: string
  }[] = []

  /**
   * Records a drawing operation.
   *
   * @param op - The name of the called method.
   * @param args - The arguments the method was called with.
   */
  private record(op: string, ...args: unknown[]) {
    this.calls.push({
      op,
      args,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      globalAlpha: this.globalAlpha,
      lineWidth: this.lineWidth,
    })
  }

  /**
   * Removes every recorded operation and path.
   */
  reset() {
    this.calls.length = 0
    this.currentPath = []
    this.completedPaths.length = 0
    this.saveStack = []
  }

  /**
   * Returns the recorded operations whose name matches the given one.
   *
   * @param op - The name of the operation to look for.
   * @returns The matching recorded operations, in order.
   */
  callsOf(op: string): DrawCall[] {
    return this.calls.filter(call => call.op === op)
  }

  /**
   * Starts a new path.
   */
  beginPath() {
    this.record('beginPath')
    this.currentPath = []
  }

  /**
   * Moves the current point of the path.
   *
   * @param x - The horizontal coordinate.
   * @param y - The vertical coordinate.
   */
  moveTo(x: number, y: number) {
    this.record('moveTo', x, y)
    this.currentPath.push({ op: 'moveTo', args: [x, y] })
  }

  /**
   * Adds a straight segment to the current path.
   *
   * @param x - The horizontal coordinate of the segment's end.
   * @param y - The vertical coordinate of the segment's end.
   */
  lineTo(x: number, y: number) {
    this.record('lineTo', x, y)
    this.currentPath.push({ op: 'lineTo', args: [x, y] })
  }

  /**
   * Adds a quadratic Bézier segment to the current path.
   *
   * @param cpx - The horizontal coordinate of the control point.
   * @param cpy - The vertical coordinate of the control point.
   * @param x - The horizontal coordinate of the segment's end.
   * @param y - The vertical coordinate of the segment's end.
   */
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.record('quadraticCurveTo', cpx, cpy, x, y)
    this.currentPath.push({ op: 'quadraticCurveTo', args: [cpx, cpy, x, y] })
  }

  /**
   * Adds a cubic Bézier segment to the current path.
   *
   * @param cp1x - The horizontal coordinate of the first control point.
   * @param cp1y - The vertical coordinate of the first control point.
   * @param cp2x - The horizontal coordinate of the second control point.
   * @param cp2y - The vertical coordinate of the second control point.
   * @param x - The horizontal coordinate of the segment's end.
   * @param y - The vertical coordinate of the segment's end.
   */
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ) {
    this.record('bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y)
    this.currentPath.push({
      op: 'bezierCurveTo',
      args: [cp1x, cp1y, cp2x, cp2y, x, y],
    })
  }

  /**
   * Adds an arc to the current path.
   *
   * @param x - The horizontal coordinate of the arc's centre.
   * @param y - The vertical coordinate of the arc's centre.
   * @param radius - The arc's radius.
   * @param startAngle - The angle at which the arc starts, in radians.
   * @param endAngle - The angle at which the arc ends, in radians.
   * @param counterclockwise - Whether the arc is drawn counter-clockwise.
   */
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false,
  ) {
    this.record('arc', x, y, radius, startAngle, endAngle, counterclockwise)
    this.currentPath.push({
      op: 'arc',
      args: [x, y, radius, startAngle, endAngle, counterclockwise ? 1 : 0],
    })
  }

  /**
   * Adds an ellipse to the current path.
   *
   * @param x - The horizontal coordinate of the ellipse's centre.
   * @param y - The vertical coordinate of the ellipse's centre.
   * @param radiusX - The ellipse's horizontal radius.
   * @param radiusY - The ellipse's vertical radius.
   * @param rotation - The ellipse's rotation, in radians.
   * @param startAngle - The angle at which the ellipse starts, in radians.
   * @param endAngle - The angle at which the ellipse ends, in radians.
   * @param counterclockwise - Whether the ellipse is drawn counter-clockwise.
   */
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false,
  ) {
    this.record(
      'ellipse',
      x,
      y,
      radiusX,
      radiusY,
      rotation,
      startAngle,
      endAngle,
      counterclockwise,
    )
    this.currentPath.push({
      op: 'ellipse',
      args: [
        x,
        y,
        radiusX,
        radiusY,
        rotation,
        startAngle,
        endAngle,
        counterclockwise ? 1 : 0,
      ],
    })
  }

  /**
   * Adds a rectangle to the current path.
   *
   * @param x - The horizontal coordinate of the rectangle's top-left corner.
   * @param y - The vertical coordinate of the rectangle's top-left corner.
   * @param width - The rectangle's width.
   * @param height - The rectangle's height.
   */
  rect(x: number, y: number, width: number, height: number) {
    this.record('rect', x, y, width, height)
    this.currentPath.push({ op: 'rect', args: [x, y, width, height] })
  }

  /**
   * Closes the current path.
   */
  closePath() {
    this.record('closePath')
    this.currentPath.push({ op: 'closePath', args: [] })
  }

  /**
   * Fills the current path.
   */
  fill() {
    this.record('fill')
    this.completedPaths.push([...this.currentPath])
  }

  /**
   * Strokes the current path.
   */
  stroke() {
    this.record('stroke')
    this.completedPaths.push([...this.currentPath])
  }

  /**
   * Fills a rectangle.
   *
   * @param x - The horizontal coordinate of the rectangle's top-left corner.
   * @param y - The vertical coordinate of the rectangle's top-left corner.
   * @param width - The rectangle's width.
   * @param height - The rectangle's height.
   */
  fillRect(x: number, y: number, width: number, height: number) {
    this.record('fillRect', x, y, width, height)
  }

  /**
   * Strokes a rectangle.
   *
   * @param x - The horizontal coordinate of the rectangle's top-left corner.
   * @param y - The vertical coordinate of the rectangle's top-left corner.
   * @param width - The rectangle's width.
   * @param height - The rectangle's height.
   */
  strokeRect(x: number, y: number, width: number, height: number) {
    this.record('strokeRect', x, y, width, height)
  }

  /**
   * Clears a rectangle.
   *
   * @param x - The horizontal coordinate of the rectangle's top-left corner.
   * @param y - The vertical coordinate of the rectangle's top-left corner.
   * @param width - The rectangle's width.
   * @param height - The rectangle's height.
   */
  clearRect(x: number, y: number, width: number, height: number) {
    this.record('clearRect', x, y, width, height)
  }

  /**
   * Fills a text run.
   *
   * @param text - The text to draw.
   * @param x - The horizontal coordinate of the text's anchor.
   * @param y - The vertical coordinate of the text's anchor.
   */
  fillText(text: string, x: number, y: number) {
    this.record('fillText', text, x, y)
  }

  /**
   * Strokes a text run.
   *
   * @param text - The text to draw.
   * @param x - The horizontal coordinate of the text's anchor.
   * @param y - The vertical coordinate of the text's anchor.
   */
  strokeText(text: string, x: number, y: number) {
    this.record('strokeText', text, x, y)
  }

  /**
   * Measures a text run.
   *
   * @param text - The text to measure.
   * @returns The metrics of the text run.
   */
  measureText(text: string): FakeTextMetrics {
    this.record('measureText', text)

    return new FakeTextMetrics(text.length * 6)
  }

  /**
   * Saves the current drawing state.
   */
  save() {
    this.record('save')
    this.saveStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
    })
  }

  /**
   * Restores the previously saved drawing state.
   */
  restore() {
    this.record('restore')

    const state = this.saveStack.pop()

    if (state) {
      this.fillStyle = state.fillStyle
      this.strokeStyle = state.strokeStyle
      this.lineWidth = state.lineWidth
      this.globalAlpha = state.globalAlpha
      this.font = state.font
      this.textAlign = state.textAlign
      this.textBaseline = state.textBaseline
    }
  }

  /**
   * Translates the current transformation.
   *
   * @param x - The horizontal translation.
   * @param y - The vertical translation.
   */
  translate(x: number, y: number) {
    this.record('translate', x, y)
  }

  /**
   * Rotates the current transformation.
   *
   * @param angle - The rotation angle, in radians.
   */
  rotate(angle: number) {
    this.record('rotate', angle)
  }

  /**
   * Scales the current transformation.
   *
   * @param x - The horizontal scale factor.
   * @param y - The vertical scale factor.
   */
  scale(x: number, y: number) {
    this.record('scale', x, y)
  }

  /**
   * Replaces the current transformation.
   *
   * @param a - The first matrix component.
   * @param b - The second matrix component.
   * @param c - The third matrix component.
   * @param d - The fourth matrix component.
   * @param e - The fifth matrix component.
   * @param f - The sixth matrix component.
   */
  setTransform(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) {
    this.record('setTransform', a, b, c, d, e, f)
  }

  /**
   * Resets the current transformation.
   */
  resetTransform() {
    this.record('resetTransform')
  }

  /**
   * Intersects the current path with the clipping region.
   */
  clip() {
    this.record('clip')
  }

  /**
   * Draws another canvas or image.
   *
   * @param image - The image to draw.
   * @param dx - The horizontal offset of the drawn image.
   * @param dy - The vertical offset of the drawn image.
   */
  drawImage(image: unknown, dx: number, dy: number) {
    this.record('drawImage', image, dx, dy)
  }

  /**
   * Creates a linear colour gradient.
   *
   * @param x0 - The horizontal coordinate of the gradient's start point.
   * @param y0 - The vertical coordinate of the gradient's start point.
   * @param x1 - The horizontal coordinate of the gradient's end point.
   * @param y1 - The vertical coordinate of the gradient's end point.
   * @returns The created gradient.
   */
  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    this.record('createLinearGradient', x0, y0, x1, y1)

    return new FakeGradient()
  }

  /**
   * Creates a radial colour gradient.
   *
   * @param x0 - The horizontal coordinate of the gradient's centre.
   * @param y0 - The vertical coordinate of the gradient's centre.
   * @param r0 - The radius of the inner circle.
   * @param x1 - The horizontal coordinate of the gradient's outer circle.
   * @param y1 - The vertical coordinate of the gradient's outer circle.
   * @param r1 - The radius of the outer circle.
   * @returns The created gradient.
   */
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ) {
    this.record('createRadialGradient', x0, y0, r0, x1, y1, r1)

    return new FakeGradient()
  }
}

/**
 * The event object handed to the stubbed event listeners.
 */
export class FakeEvent {
  /** Whether {@link preventDefault} was called. */
  defaultPrevented = false
  /** Whether the event propagation was stopped. */
  propagationStopped = false

  /**
   * Creates an event.
   *
   * @param type - The event's type.
   */
  constructor(readonly type: string) {}

  /**
   * Prevents the browser's default action for the event.
   */
  preventDefault() {
    this.defaultPrevented = true
  }

  /**
   * Stops the event from bubbling up the tree.
   */
  stopPropagation() {
    this.propagationStopped = true
  }

  /**
   * Stops every other listener of the same event from being called.
   */
  stopImmediatePropagation() {
    this.propagationStopped = true
  }
}

/**
 * A keyboard event handed to the stubbed event listeners.
 */
export class FakeKeyboardEvent extends FakeEvent {
  /**
   * Creates a keyboard event.
   *
   * @param type - The event's type.
   * @param key - The value of the pressed key.
   * @param options - Additional event properties.
   */
  constructor(type: string, readonly key: string, options: {
    shiftKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
    altKey?: boolean
  } = {}) {
    super(type)

    this.shiftKey = options.shiftKey ?? false
    this.ctrlKey = options.ctrlKey ?? false
    this.metaKey = options.metaKey ?? false
    this.altKey = options.altKey ?? false
  }

  /** Whether the Shift key was held down. */
  shiftKey: boolean
  /** Whether the Control key was held down. */
  ctrlKey: boolean
  /** Whether the Meta key was held down. */
  metaKey: boolean
  /** Whether the Alt key was held down. */
  altKey: boolean
}

/**
 * A pointer event handed to the stubbed event listeners.
 */
export class FakePointerEvent extends FakeEvent {
  /**
   * Creates a pointer event.
   *
   * @param type - The event's type.
   * @param options - Additional event properties.
   */
  constructor(type: string, options: {
    pointerId?: number
    button?: number
    clientX?: number
    clientY?: number
    shiftKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
  } = {}) {
    super(type)

    this.pointerId = options.pointerId ?? 1
    this.button = options.button ?? 0
    this.clientX = options.clientX ?? 0
    this.clientY = options.clientY ?? 0
    this.shiftKey = options.shiftKey ?? false
    this.ctrlKey = options.ctrlKey ?? false
    this.metaKey = options.metaKey ?? false
  }

  /** The identifier of the pointer that produced the event. */
  pointerId: number
  /** The button that was pressed. */
  button: number
  /** The horizontal position of the pointer. */
  clientX: number
  /** The vertical position of the pointer. */
  clientY: number
  /** Whether the Shift key was held down. */
  shiftKey: boolean
  /** Whether the Control key was held down. */
  ctrlKey: boolean
  /** Whether the Meta key was held down. */
  metaKey: boolean
}

/**
 * A wheel event handed to the stubbed event listeners.
 */
export class FakeWheelEvent extends FakeEvent {
  /**
   * Creates a wheel event.
   *
   * @param type - The event's type.
   * @param options - Additional event properties.
   */
  constructor(type: string, options: {
    deltaX?: number
    deltaY?: number
    ctrlKey?: boolean
    metaKey?: boolean
  } = {}) {
    super(type)

    this.deltaX = options.deltaX ?? 0
    this.deltaY = options.deltaY ?? 0
    this.ctrlKey = options.ctrlKey ?? false
    this.metaKey = options.metaKey ?? false
  }

  /** The horizontal scroll delta. */
  deltaX: number
  /** The vertical scroll delta. */
  deltaY: number
  /** Whether the Control key was held down. */
  ctrlKey: boolean
  /** Whether the Meta key was held down. */
  metaKey: boolean
}

/**
 * The subset of the `EventListener` signature used by the stub.
 */
export type StubEventListener = (event: never) => void

/**
 * A stand-in for a DOM element.
 */
export class FakeElement {
  /** The element's tag name, in upper case. */
  readonly tagName: string
  /** The element's id. */
  id = ''
  /** The element's class name. */
  className = ''
  /** The element's inline styles. */
  readonly style: Record<string, unknown> = {}
  /** The element's child elements. */
  readonly children: FakeElement[] = []
  /** The element's parent element, or `null` when it is detached. */
  parentElement: FakeElement | null = null
  /** The element's text content. */
  textContent = ''
  /** The element's inner HTML. */
  innerHTML = ''
  /** The element's checked state, for checkbox inputs. */
  checked = false
  /** The element's value. */
  value = ''
  /** The element's type. */
  type = ''
  /** The element's minimum value, for range inputs. */
  min = ''
  /** The element's maximum value, for range inputs. */
  max = ''
  /** The element's step, for range inputs. */
  step = ''
  /** Whether the element is disabled. */
  disabled = false
  /** The element's tab index. */
  tabIndex = 0
  /** The pointer identifiers currently captured by the element. */
  readonly capturedPointers = new Set<number>()

  private readonly listeners = new Map<string, Set<StubEventListener>>()
  private readonly classNames = new Set<string>()

  /**
   * Creates an element.
   *
   * @param tagName - The element's tag name.
   * @param canvasContext - The 2D context returned by `getContext('2d')`, when
   *   the element is a canvas.
   */
  constructor(
    tagName: string,
    protected readonly canvasContext: FakeCanvasRenderingContext2D | null = null,
  ) {
    this.tagName = tagName.toUpperCase()
  }

  /** The element's class list. */
  readonly classList = {
    /**
     * Adds one or more class names to the element.
     *
     * @param names - The class names to add.
     */
    add: (...names: string[]) => {
      names.forEach(name => this.classNames.add(name))
      this.syncClassName()
    },
    /**
     * Removes one or more class names from the element.
     *
     * @param names - The class names to remove.
     */
    remove: (...names: string[]) => {
      names.forEach(name => this.classNames.delete(name))
      this.syncClassName()
    },
    /**
     * Tells whether the element carries a class name.
     *
     * @param name - The class name to look for.
     * @returns `true` when the element carries the class name.
     */
    contains: (name: string) => this.classNames.has(name),
    /**
     * Adds or removes a class name, depending on its current presence.
     *
     * @param name - The class name to toggle.
     */
    toggle: (name: string) => {
      if (this.classNames.has(name)) this.classNames.delete(name)
      else this.classNames.add(name)

      this.syncClassName()
    },
  }

  private syncClassName() {
    this.className = [...this.classNames].join(' ')
  }

  /**
   * Appends a child element.
   *
   * @param child - The child to append.
   * @returns The appended child.
   */
  appendChild<T extends FakeElement>(child: T): T {
    child.parentElement?.removeChild(child)

    child.parentElement = this
    this.children.push(child)

    return child
  }

  /**
   * Removes a child element.
   *
   * @param child - The child to remove.
   * @returns The removed child.
   */
  removeChild<T extends FakeElement>(child: T): T {
    const index = this.children.indexOf(child)

    if (index !== -1) this.children.splice(index, 1)

    child.parentElement = null

    return child
  }

  /**
   * Detaches the element from its parent.
   */
  remove() {
    this.parentElement?.removeChild(this)
  }

  /**
   * Registers an event listener.
   *
   * @param type - The event type to listen for.
   * @param listener - The listener to invoke.
   */
  addEventListener(type: string, listener: StubEventListener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())

    this.listeners.get(type)!.add(listener)
  }

  /**
   * Removes an event listener.
   *
   * @param type - The event type the listener was registered for.
   * @param listener - The listener to remove.
   */
  removeEventListener(type: string, listener: StubEventListener) {
    this.listeners.get(type)?.delete(listener)
  }

  /**
   * Dispatches an event to the registered listeners.
   *
   * @param event - The event to dispatch.
   * @returns `true` when the event was dispatched.
   */
  dispatchEvent(event: FakeEvent): boolean {
    const listeners = this.listeners.get(event.type)

    if (!listeners) return true

    ;(event as unknown as { target: FakeElement | null }).target = this

    listeners.forEach(listener => listener(event as never))

    return !event.propagationStopped
  }

  /**
   * Returns the element's bounding box.
   *
   * @returns The bounding box, as a plain object.
   */
  getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
    }
  }

  /**
   * Captures a pointer.
   *
   * @param pointerId - The identifier of the pointer to capture.
   */
  setPointerCapture(pointerId: number) {
    this.capturedPointers.add(pointerId)
  }

  /**
   * Releases a captured pointer.
   *
   * @param pointerId - The identifier of the pointer to release.
   */
  releasePointerCapture(pointerId: number) {
    this.capturedPointers.delete(pointerId)
  }

  /**
   * Gives the element keyboard focus.
   */
  focus() {}

  /**
   * Removes the element's keyboard focus.
   */
  blur() {}

  /**
   * Returns the element's 2D rendering context.
   *
   * @param contextId - The identifier of the requested context.
   * @returns The 2D rendering context, or `null` for other context types.
   */
  getContext(contextId: string): FakeCanvasRenderingContext2D | null {
    return contextId === '2d' ? this.canvasContext : null
  }
}

/**
 * A stand-in for a canvas element.
 */
export class FakeCanvasElement extends FakeElement {
  /** The canvas's width, in pixels. */
  width = 800
  /** The canvas's height, in pixels. */
  height = 600

  /**
   * Creates a canvas element.
   *
   * @param context - The 2D context returned by `getContext('2d')`.
   */
  constructor(readonly context: FakeCanvasRenderingContext2D) {
    super('canvas', context)
  }
}

/**
 * A stand-in for the `document` object.
 */
export class FakeDocument {
  /** The document's body element. */
  readonly body = new FakeElement('body')
  /** The document's root element. */
  readonly documentElement = new FakeElement('html')
  /** The document's font loading API. */
  readonly fonts = {
    /**
     * Requests a font.
     *
     * @param _font - The font shorthand to load.
     * @returns A promise that resolves once the font is available.
     */
    load: (_font: string) => Promise.resolve([] as unknown[]),
    /**
     * Tells whether a font is already loaded.
     *
     * @param _font - The font to look for.
     * @returns Always `false`, since the stub loads fonts instantly.
     */
    check: (_font: string) => false,
  }

  private readonly elementsById = new Map<string, FakeElement>()
  private readonly listeners = new Map<string, Set<StubEventListener>>()

  /**
   * Registers an element under a given id.
   *
   * @param id - The id to register the element under.
   * @param element - The element to register.
   */
  registerElement(id: string, element: FakeElement) {
    element.id = id
    this.elementsById.set(id, element)
  }

  /**
   * Returns the element registered under a given id.
   *
   * @param id - The id to look up.
   * @returns The element, or `null` when no element carries the id.
   */
  getElementById(id: string): FakeElement | null {
    return this.elementsById.get(id) ?? null
  }

  /**
   * Creates a new element.
   *
   * @param tagName - The tag name of the element.
   * @returns The created element.
   */
  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName)
  }

  /**
   * Creates a new element in a namespace.
   *
   * @param _namespace - The namespace of the element.
   * @param tagName - The tag name of the element.
   * @returns The created element.
   */
  createElementNS(_namespace: string, tagName: string): FakeElement {
    return new FakeElement(tagName)
  }

  /**
   * Registers an event listener.
   *
   * @param type - The event type to listen for.
   * @param listener - The listener to invoke.
   */
  addEventListener(type: string, listener: StubEventListener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())

    this.listeners.get(type)!.add(listener)
  }

  /**
   * Removes an event listener.
   *
   * @param type - The event type the listener was registered for.
   * @param listener - The listener to remove.
   */
  removeEventListener(type: string, listener: StubEventListener) {
    this.listeners.get(type)?.delete(listener)
  }

  /**
   * Dispatches an event to the registered listeners.
   *
   * @param event - The event to dispatch.
   * @returns `true` when the event was dispatched.
   */
  dispatchEvent(event: FakeEvent): boolean {
    const listeners = this.listeners.get(event.type)

    if (!listeners) return true

    ;(event as unknown as { target: FakeDocument | null }).target = this

    listeners.forEach(listener => listener(event as never))

    return !event.propagationStopped
  }

  /**
   * Returns the elements matching a CSS selector.
   *
   * @param selector - The selector to match. Only `#id` and `tag` are
   *   supported.
   * @returns The matching elements.
   */
  querySelectorAll(selector: string): FakeElement[] {
    const all = [...this.elementsById.values()]

    if (selector.startsWith('#')) {
      return all.filter(element => element.id === selector.slice(1))
    }

    return all.filter(element => element.tagName === selector.toUpperCase())
  }

  /**
   * Returns the first element matching a CSS selector.
   *
   * @param selector - The selector to match. Only `#id` and `tag` are
   *   supported.
   * @returns The matching element, or `null` when there is none.
   */
  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null
  }
}

/**
 * A stand-in for the browser's `localStorage`.
 */
export class FakeStorage {
  /** The stored values, keyed by name. */
  private readonly values = new Map<string, string>()

  /**
   * Returns the number of stored items.
   *
   * @returns The number of stored items.
   */
  get length(): number {
    return this.values.size
  }

  /**
   * Returns the name of the stored item at a given position.
   *
   * @param index - The position of the item.
   * @returns The name of the item.
   */
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  /**
   * Returns the value stored under a given name.
   *
   * @param name - The name of the item.
   * @returns The stored value, or `null` when there is none.
   */
  getItem(name: string): string | null {
    return this.values.get(name) ?? null
  }

  /**
   * Stores a value under a given name.
   *
   * @param name - The name of the item.
   * @param value - The value to store.
   */
  setItem(name: string, value: string) {
    this.values.set(name, value)
  }

  /**
   * Removes the item stored under a given name.
   *
   * @param name - The name of the item.
   */
  removeItem(name: string) {
    this.values.delete(name)
  }

  /**
   * Removes every stored item.
   */
  clear() {
    this.values.clear()
  }
}

/**
 * A stand-in for the browser's `AudioParam`.
 */
export class FakeAudioParam {
  /** The parameter's current value. */
  value = 0

  /**
   * Schedules a value change.
   *
   * @param value - The new value.
   * @param _startTime - The time at which the change takes effect.
   */
  setValueAtTime(value: number, _startTime?: number) {
    this.value = value
  }

  /**
   * Schedules a linear ramp towards a value.
   *
   * @param value - The value to ramp towards.
   * @param _startTime - The time at which the ramp starts.
   * @param _endTime - The time at which the ramp ends.
   */
  linearRampToValueAtTime(value: number, _startTime?: number, _endTime?: number) {
    this.value = value
  }

  /**
   * Schedules an exponential ramp towards a value.
   *
   * @param value - The value to ramp towards.
   * @param _startTime - The time at which the ramp starts.
   * @param _endTime - The time at which the ramp ends.
   */
  exponentialRampToValueAtTime(
    value: number,
    _startTime?: number,
    _endTime?: number,
  ) {
    this.value = value
  }

  /**
   * Cancels every scheduled change.
   */
  cancelScheduledValues() {}
}

/**
 * A stand-in for the browser's `AudioNode`.
 */
export class FakeAudioNode {
  /** The node's gain, for gain nodes. */
  readonly gain = new FakeAudioParam()
  /** The node's frequency, for oscillator and filter nodes. */
  readonly frequency = new FakeAudioParam()
  /** The node's detune, for oscillator nodes. */
  readonly detune = new FakeAudioParam()
  /** The node's quality factor, for filter nodes. */
  readonly Q = new FakeAudioParam()
  /** The node's delay time, for delay nodes. */
  readonly delayTime = new FakeAudioParam()
  /** The node's playback rate. */
  readonly playbackRate = new FakeAudioParam()

  /** The nodes this node is connected to. */
  readonly connections: FakeAudioNode[] = []
  /** The callback invoked when the node ends. */
  onended: (() => void) | null = null

  /**
   * Connects the node to another one.
   *
   * @param destination - The node to connect to.
   * @returns The destination node.
   */
  connect(destination: FakeAudioNode) {
    this.connections.push(destination)

    return destination
  }

  /**
   * Disconnects the node from another one.
   *
   * @param destination - The node to disconnect from.
   */
  disconnect(destination?: FakeAudioNode) {
    if (!destination) this.connections.length = 0
    else {
      const index = this.connections.indexOf(destination)
      if (index !== -1) this.connections.splice(index, 1)
    }
  }
}

/**
 * A stand-in for the browser's `AudioContext`.
 */
export class FakeAudioContext {
  /** The context's sample rate. */
  readonly sampleRate = 44100
  /** The context's current time, in seconds. */
  currentTime = 0
  /** The context's state. */
  state = 'running'
  /** The context's destination node. */
  readonly destination = new FakeAudioNode()
  /** Every node created by the context. */
  readonly createdNodes: FakeAudioNode[] = []

  /**
   * Creates a gain node.
   *
   * @returns The created node.
   */
  createGain(): FakeAudioNode {
    return this.track(new FakeAudioNode())
  }

  /**
   * Creates an oscillator node.
   *
   * @returns The created node.
   */
  createOscillator(): FakeAudioNode {
    return this.track(new FakeAudioNode())
  }

  /**
   * Creates a buffer source node.
   *
   * @returns The created node.
   */
  createBufferSource(): FakeAudioNode {
    return this.track(new FakeAudioNode())
  }

  /**
   * Creates a biquad filter node.
   *
   * @returns The created node.
   */
  createBiquadFilter(): FakeAudioNode {
    return this.track(new FakeAudioNode())
  }

  /**
   * Creates a delay node.
   *
   * @returns The created node.
   */
  createDelay(): FakeAudioNode {
    return this.track(new FakeAudioNode())
  }

  /**
   * Creates a stereo panner node.
   *
   * @returns The created node.
   */
  createStereoPanner(): FakeAudioNode {
    return this.track(new FakeAudioNode())
  }

  /**
   * Creates an audio buffer.
   *
   * @param _channels - The number of channels.
   * @param length - The buffer's length, in samples.
   * @param _sampleRate - The buffer's sample rate.
   * @returns The created buffer.
   */
  createBuffer(
    _channels: number,
    length: number,
    _sampleRate: number,
  ): { length: number; getChannelData: (channel: number) => Float32Array } {
    return {
      length,
      getChannelData: () => new Float32Array(length),
    }
  }

  /**
   * Resumes the context.
   *
   * @returns A promise that resolves once the context is running.
   */
  resume(): Promise<void> {
    this.state = 'running'

    return Promise.resolve()
  }

  /**
   * Suspends the context.
   *
   * @returns A promise that resolves once the context is suspended.
   */
  suspend(): Promise<void> {
    this.state = 'suspended'

    return Promise.resolve()
  }

  /**
   * Closes the context.
   *
   * @returns A promise that resolves once the context is closed.
   */
  close(): Promise<void> {
    this.state = 'closed'

    return Promise.resolve()
  }

  private track(node: FakeAudioNode) {
    this.createdNodes.push(node)

    return node
  }
}

/**
 * The handles of the animation frames that were requested but not yet run.
 */
export const pendingAnimationFrames = new Map<
  number,
  (time: number) => void
>()

let nextAnimationFrameId = 1

/**
 * The identifiers of the timers started through `setInterval`.
 */
export const activeIntervals = new Map<number, () => void>()

let nextIntervalId = 1

/**
 * The state shared by every stubbed browser global.
 */
export interface DomStub {
  /** The stubbed `document`. */
  document: FakeDocument
  /** The stubbed canvas the demos draw into. */
  animation: FakeCanvasElement
  /** The stubbed 2D context of {@link animation}. */
  context: FakeCanvasRenderingContext2D
  /** The stubbed `window.location`. */
  location: { search: string; href: string }
  /** The stubbed `localStorage`. */
  localStorage: FakeStorage
}

/**
 * The stub installed by {@link installDom}.
 */
export let domStub: DomStub

/**
 * The number of demos shipped with the application.
 *
 * The stub registers one menu button per demo, so that the application shell
 * can be exercised without a real `index.html`.
 */
export const STUB_DEMO_COUNT = 22

/**
 * Builds the stubbed browser environment without installing it.
 *
 * @returns The freshly built stub.
 */
export function createDomStub(): DomStub {
  const context = new FakeCanvasRenderingContext2D()
  const animation = new FakeCanvasElement(context)
  const document = new FakeDocument()

  document.registerElement('animation', animation)
  document.registerElement('canvas-container', new FakeElement('div'))
  document.body.appendChild(document.getElementById('canvas-container')!)

  for (let i = 1; i <= STUB_DEMO_COUNT; i++) {
    document.registerElement(`demo${i}`, new FakeElement('button'))
  }

  document.registerElement(
    'show-3d-axes-checkbox',
    new FakeElement('input'),
  )
  document.registerElement(
    'enable-auto-rotation-checkbox',
    new FakeElement('input'),
  )
  document.registerElement('show-normals-checkbox', new FakeElement('input'))

  return {
    document,
    animation,
    context,
    location: { search: '', href: 'http://localhost:5173/' },
    localStorage: new FakeStorage(),
  }
}

/**
 * Installs the stubbed browser globals.
 *
 * The function is idempotent: calling it more than once reuses the same stub.
 *
 * @returns The installed stub.
 */
export function installDom(): DomStub {
  if (domStub) return domStub

  domStub = createDomStub()

  const globals = globalThis as unknown as Record<string, unknown>

  globals.document = domStub.document
  globals.window = {
    location: domStub.location,
    addEventListener: (type: string, listener: StubEventListener) =>
      domStub.document.addEventListener(type, listener),
    removeEventListener: (type: string, listener: StubEventListener) =>
      domStub.document.removeEventListener(type, listener),
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    requestAnimationFrame: (callback: (time: number) => void) =>
      requestAnimationFrame(callback),
    cancelAnimationFrame: (handle: number) => cancelAnimationFrame(handle),
  }

  globals.self = globalThis

  globals.addEventListener = (type: string, listener: StubEventListener) =>
    domStub.document.addEventListener(type, listener)
  globals.removeEventListener = (type: string, listener: StubEventListener) =>
    domStub.document.removeEventListener(type, listener)

  globals.requestAnimationFrame = (callback: (time: number) => void) => {
    const id = nextAnimationFrameId++

    pendingAnimationFrames.set(id, callback)

    return id
  }

  globals.cancelAnimationFrame = (handle: number) => {
    pendingAnimationFrames.delete(handle)
  }

  globals.localStorage = domStub.localStorage

  globals.setInterval = ((callback: () => void, _delay?: number) => {
    const id = nextIntervalId++

    activeIntervals.set(id, callback)

    return id
  }) as unknown as typeof setInterval

  globals.clearInterval = ((handle: number) => {
    activeIntervals.delete(handle)
  }) as unknown as typeof clearInterval

  globals.AudioContext = FakeAudioContext

  return domStub
}

/**
 * Runs the pending animation frames.
 *
 * @param times - How many frames to run.
 * @param startTime - The timestamp of the first frame, in milliseconds.
 * @param step - The time between two frames, in milliseconds.
 * @returns The timestamps the frames were run with.
 */
export function flushAnimationFrames(
  times = 1,
  startTime = 0,
  step = 16,
): number[] {
  const timestamps: number[] = []
  let time = startTime

  for (let i = 0; i < times; i++) {
    const pending = [...pendingAnimationFrames.entries()]

    pendingAnimationFrames.clear()

    if (pending.length === 0) break

    timestamps.push(time)

    pending.forEach(([, callback]) => callback(time))

    time += step
  }

  return timestamps
}

/**
 * Removes every pending animation frame.
 */
export function clearAnimationFrames() {
  pendingAnimationFrames.clear()
}

/**
 * Runs every registered interval callback once.
 *
 * @returns The number of callbacks that were run.
 */
export function fireIntervals(): number {
  const callbacks = [...activeIntervals.values()]

  callbacks.forEach(callback => callback())

  return callbacks.length
}

/**
 * Resets the stub's mutable state, keeping the registered elements in place.
 */
export function resetDomStub() {
  domStub.context.reset()
  domStub.location.search = ''
  domStub.localStorage.clear()
  domStub.document.body.children.length = 0
  domStub.document.body.appendChild(
    domStub.document.getElementById('canvas-container')!,
  )

  clearAnimationFrames()
  activeIntervals.clear()
}

/**
 * Creates a keyboard event.
 *
 * @param key - The value of the pressed key.
 * @param options - Additional event properties.
 * @returns The created event.
 */
export function createKeyboardEvent(
  key: string,
  options: {
    shiftKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
    altKey?: boolean
  } = {},
): FakeKeyboardEvent {
  return new FakeKeyboardEvent('keydown', key, options)
}

/**
 * Creates a pointer event.
 *
 * @param type - The event type.
 * @param options - Additional event properties.
 * @returns The created event.
 */
export function createPointerEvent(
  type: string,
  options: {
    pointerId?: number
    button?: number
    clientX?: number
    clientY?: number
    shiftKey?: boolean
    ctrlKey?: boolean
    metaKey?: boolean
  } = {},
): FakePointerEvent {
  return new FakePointerEvent(type, options)
}

/**
 * Creates a wheel event.
 *
 * @param type - The event type.
 * @param options - Additional event properties.
 * @returns The created event.
 */
export function createWheelEvent(
  type: string,
  options: {
    deltaX?: number
    deltaY?: number
    ctrlKey?: boolean
    metaKey?: boolean
  } = {},
): FakeWheelEvent {
  return new FakeWheelEvent(type, options)
}

// Installing the stub on import keeps every test file simple: importing this
// module is enough to make the browser globals available.
installDom()
