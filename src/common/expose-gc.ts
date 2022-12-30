import v8 from "v8";
import vm from "vm";

v8.setFlagsFromString("--expose_gc");

const gc = vm.runInNewContext("gc") as () => void;
export default gc;

//This is currently unused, but I'm keeping it just in-case I actually do end
//up with a need to force GC.
