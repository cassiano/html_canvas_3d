/// <reference lib="deno.ns" />

import './dom_stub.ts'

import { earth, sun } from '../demo21/main.ts'
import { AstronomicalBody } from '../demo21/astronomical_body.ts'

console.log('imported', typeof AstronomicalBody, earth?.name, sun?.name)
