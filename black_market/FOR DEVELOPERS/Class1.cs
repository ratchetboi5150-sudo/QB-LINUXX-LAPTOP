using System;
using System.Windows.Forms;
using GTA;
using GTA.Native;
using GTA.Math;
using NativeUI;
using System.Collections.Generic;
using System.Linq;

namespace TheBlackMarket
{
    public class Main : Script
    {
        List<Vector3> Dealer_Locations = new List<Vector3>();
        int GameTimeReference = Game.GameTime;
        private MenuPool _menuPool;
        private UIMenu mainMenu;
        Ped d;
        public Main()
        {
            //dealer 1 near lester
            Dealer_Locations.Add(new Vector3(1295.104f, -1699.532f, 54.10324f));
            //dealer 2 near grove street
            Dealer_Locations.Add(new Vector3(284.9437f, -1772.874f, 27.08555f));
            //dealer 3 Vespucci
            Dealer_Locations.Add(new Vector3(-1259.311f, -824.0254f, 16.1244f));
            //dealer 4 Sandy Shores
            Dealer_Locations.Add(new Vector3(1706.8120f, 3844.8401f, 33.9533f));
            //dealer 5 Paleto Bay
            Dealer_Locations.Add(new Vector3(-173.8639f, 6395.5967f, 30.515f));

            Blip[] blips = World.GetActiveBlips(); 
            if (blips.Count() > 0) // deletes black market blips if there are more than one.
            {
                for (int i2 = 0; i2 < blips.Count(); i2++)
                {
                    for (int i = 0; i < Dealer_Locations.Count; i++)
                    {
                        if (blips[i2].Position == Dealer_Locations[i])
                        {
                            blips[i2].Remove();
                        }
                    }
                }
            }

            for (int i = 0; i < Dealer_Locations.Count; i++) // places a blip at each of the dealer locations.
            {
                Blip b = World.CreateBlip(Dealer_Locations[i]);
                b.Sprite = BlipSprite.MachineGun;
                b.Color = BlipColor.Yellow3;
                b.Scale = 0.85f;
                b.IsShortRange = true;
                b.Name = "BlackMarket Arms Dealer";
            }

            Tick += onTick;
            KeyDown += onKeyDown;

            _menuPool = new MenuPool();
            mainMenu = new UIMenu("The Black Market", "~b~Arms Dealing");
            _menuPool.Add(mainMenu);
            weapons(mainMenu);
            _menuPool.RefreshIndex();

            Tick += (o, e) => _menuPool.ProcessMenus();
            KeyDown += (o, e) =>
            {
            };

            Interval = 1;
            GameTimeReference = Game.GameTime + 500;

        }
        public void weapons(UIMenu menu)
        {
            //Calling Menu1
            var submenu1 = _menuPool.AddSubMenu(menu, "Buy Weapons");
            var submenu2 = _menuPool.AddSubMenu(menu, "Customize Weapons");
            var submenucr = _menuPool.AddSubMenu(submenu2, "Compact Rifle");
            var submenucp = _menuPool.AddSubMenu(submenu2, "Combat PDW");
            var submenus = _menuPool.AddSubMenu(submenu2, "SMG");
            var submenuar = _menuPool.AddSubMenu(submenu2, "Assault Rifle");
            var submenump = _menuPool.AddSubMenu(submenu2, "Machine Pistol");
            var submenucarr = _menuPool.AddSubMenu(submenu2, "Carbine Rifle");
            var submenupumps = _menuPool.AddSubMenu(submenu2, "Pump Shotgun");
            var submenucomp = _menuPool.AddSubMenu(submenu2, "Combat Pistol");
            var submenuassur = _menuPool.AddSubMenu(submenu2, "Assault Rifle");

            for (int i = 0; i < 1; i++)
                //Notifying of Selected List Item
                submenu1.OnListChange += (sender, item, index) =>
                {

                    //REQUIRED
                };

            
            var compactrifle = new UIMenuItem("Compact Rifle - $15,000",
                "Half the size, all the power, double the recoil: there's no riskier way to say 'I'm compensating for something'");
            submenu1.AddItem(compactrifle);
            var heavyrevolver = new UIMenuItem("Heavy Revolver - $10,000",
                "A handgun with enough stopping power to drop a crazed rhino, and heavy enough to beat it to death if you're out of ammo.");
            submenu1.AddItem(heavyrevolver);
            var combatpdw = new UIMenuItem("Combat PDW - $11,000",
                "Who said personal weaponry couldn't be worthy of military personnel? Thanks to our lobbyists, not Congress. Integral suppressor.");
            submenu1.AddItem(combatpdw);
            var pistol50 = new UIMenuItem("Pistol .50 - $4,000",
                "High-impact pistol that delivers immense power but with extremely strong recoil. Holds 9 rounds in magazine.");
            submenu1.AddItem(pistol50);
            var smg = new UIMenuItem("SMG - $2,000",
                "This is known as a good all-around submachine gun. Lightweight with an accurate sight and 30-round magazine capacity.");
            submenu1.AddItem(smg);
            
            var machinepistol = new UIMenuItem("Machine Pistol - $5,000",
                "This fully automatic is the snare drum to your twin-engine V8 bass: no drive-by sounds quite right without it.");
            submenu1.AddItem(machinepistol);
            var carbinerifle = new UIMenuItem("Carbine Rifle - $20,000",
                "Powerfull rifle, Untraceable serial number.");
            submenu1.AddItem(carbinerifle);
            var pumpshotgun = new UIMenuItem("Pump Shotgun - $12,000",
                "Powerfull at medium to close range, Untraceable serial number.");
            submenu1.AddItem(pumpshotgun);
            var combatpistol = new UIMenuItem("Combat Pistol - $5,000",
                "Handy sidearm, Untraceable serial number.");
            submenu1.AddItem(combatpistol);
            var assaultrifle = new UIMenuItem("Assault Rifle - $17,000",
                "This standard assault rifle boasts a large capacity magazine and long distance accuracy.");
            submenu1.AddItem(assaultrifle);


            //ATTACHEMENTS
            var cr = new UIMenuItem("Drum Magazine - $10,000",
                "Extended capacity magazine, holding more than an extended clip.");
            submenucr.AddItem(cr);
            var ar = new UIMenuItem("Drum Magazine - $10,000",
                "Extended capacity magazine, holding more than an extended clip.");
            submenuar.AddItem(ar);
            var cp = new UIMenuItem("Drum Magazine - $10,000",
                "Extended capacity magazine, holding more than an extended clip.");
            submenucp.AddItem(cp);
            var s = new UIMenuItem("Drum Magazine - $10,000",
                "Extended capacity magazine, holding more than an extended clip.");
            submenus.AddItem(s);
            var mp = new UIMenuItem("Drum Magazine - $10,000",
                "Extended capacity magazine, holding more than an extended clip.");
            submenump.AddItem(mp);
            var carbinermag = new UIMenuItem("Drum Magazine - $10,000",
                "Extended capacity magazine, holding more than an extended clip.");
            submenucarr.AddItem(carbinermag);
            var carbinersupp = new UIMenuItem("Supressor- $30,000",
                "Reduces noise and muzzle flash.");
            submenucarr.AddItem(carbinersupp);
            var assaultrmag = new UIMenuItem("Drum Magazine - $10,000",
                "Extended capacity magazine, holding more than an extended clip.");
            submenuassur.AddItem(assaultrmag);
            var assaultrsupp = new UIMenuItem("Supressor- $30,000",
                "Reduces noise and muzzle flash.");
            submenuassur.AddItem(assaultrsupp);
            var compissupp = new UIMenuItem("Supressor- $30,000",
                "Reduces noise and muzzle flash.");
            submenucomp.AddItem(compissupp);


            // SELECTION
            submenu1.OnItemSelect += (sender, item, index) =>
            {
                if (item == pistol50)
                {
                    if (Game.Player.Money > 3999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_PISTOL50"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 4000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_PISTOL50"), 999999,
                            true, true);
                        UI.Notify("You've bought a ~b~Pistol .50!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own a Pistol .50!");
                    }
                }
                if (item == machinepistol)
                {
                    if (Game.Player.Money > 4999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_MACHINEPISTOL"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 5000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_MACHINEPISTOL"), 999999,
                            true, true);
                        UI.Notify("You've bought a ~b~Machine Pistol!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own a Machine Pistol!");
                    }
                }

                if (item == carbinerifle)
                {
                    if (Game.Player.Money > 44999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_CARBINERIFLE"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 45000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_CARBINERIFLE"), 999999,
                            true, true);
                        UI.Notify("You've bought a ~b~Carbine Rifle!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own a Carbine Rifle!");
                    }
                }
                if (item == pumpshotgun)
                {
                    if (Game.Player.Money > 11999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_PUMPSHOTGUN"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 12000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_PUMPSHOTGUN"), 999999,
                            true, true);
                        UI.Notify("You've bought a ~b~Pump Shotgun!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own a Pump Shotgun!");
                    }
                }
                if (item == combatpistol)
                {
                    if (Game.Player.Money > 4999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_COMBATPISTOL"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 5000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_COMBATPISTOL"), 999999,
                            true, true);
                        UI.Notify("You've bought a ~b~Combat Pistol!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own a Combat Pistol!");
                    }
                }
                
                if (item == compactrifle)
                {
                    if (Game.Player.Money > 14999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_COMPACTRIFLE"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 15000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_COMPACTRIFLE"),
                            999999, true, true);
                        UI.Notify("You've bought a ~b~Compact Rifle!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own a Compact Rifle!");
                    }
                }
                if (item == heavyrevolver)
                {
                    if (Game.Player.Money > 9999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_REVOLVER"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 10000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_REVOLVER"),
                            999999, true, true);
                        UI.Notify("You've bought a ~b~Heavy Revolver!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own a Heavy Revolver!");
                    }
                }
                if (item == combatpdw)
                {
                    if (Game.Player.Money > 10999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_COMBATPDW"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 11000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_COMBATPDW"),
                            999999, true, true);
                        UI.Notify("You've bought a ~b~Combat PDW!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own a Combat PDW!");
                    }
                }
                if (item == smg)
                {
                    if (Game.Player.Money > 1999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_SMG"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 2000;
                        p.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_SMG"),
                            999999, true, true);
                        UI.Notify("You've bought an ~b~SMG!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own an SMG!");
                    }
                }
                if (item == assaultrifle)
                {
                    if (Game.Player.Money > 16999 && Function.Call<bool>(Hash.HAS_PED_GOT_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_ASSAULTRIFLE"), false) == false)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 17000;
                        Game.Player.Character.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_ASSAULTRIFLE"), 999999, true, true);
                        //Function.Call(Hash.SET_CURRENT_PED_WEAPON, Game.Player.Character, Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_BRIEFCASE"), true);
                        UI.Notify("You've bought an ~b~Assault Rifle!");

                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy or you already own an Assault Rifle!");
                    }
                }
            };
            submenucomp.OnItemSelect += (sender, item, index) =>
            {
                if (item == compissupp)
                {
                    if (Game.Player.Money > 29999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 30000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 1593441988, 3271853210);
                        UI.Notify("You've bought a Supressor");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Supressor");
                    }
                }
            };
                submenuassur.OnItemSelect += (sender, item, index) =>
            {
                if(item == assaultrsupp)
                {
                    if (Game.Player.Money > 29999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 30000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 3220176749, 2805810788);
                        UI.Notify("You've bought a Supressor");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Supressor");
                    }
                }
                if (item == assaultrmag)
                {
                    if (Game.Player.Money > 9999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 10000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 3220176749, 3689981245);
                        UI.Notify("You've bought a Drum Magazine!");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Drum Magazine!");
                    }
                }
            };
            submenucarr.OnItemSelect += (sender, item, index) =>
            {
                if (item == carbinersupp)
                {
                    if (Game.Player.Money > 29999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 30000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 2210333304, 2205435306);
                        UI.Notify("You've bought a Supressor");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Supressor");
                    }
                }
                if (item == carbinermag)
                {
                    if (Game.Player.Money > 9999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 10000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 2210333304, 3127044405);
                        UI.Notify("You've bought a Drum Magazine!");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Drum Magazine!");
                    }
                }
            };
            submenucr.OnItemSelect += (sender, item, index) =>
            {
                if (item == cr)
                {
                    if (Game.Player.Money > 9999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 10000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 1649403952, 3322377230);
                        UI.Notify("You've bought a Drum Magazine!");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Drum Magazine!");
                    }
                }
            };
            submenuar.OnItemSelect += (sender, item, index) =>
            {
                if (item == ar)
                {
                    if (Game.Player.Money > 9999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 10000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 3220176749, 3689981245);
                        UI.Notify("You've bought a Drum Magazine!");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Drum Magazine!");
                    }
                }
            };
            submenucp.OnItemSelect += (sender, item, index) =>
            {
                if (item == cp)
                {
                    if (Game.Player.Money > 9999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 10000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 171789620, 1857603803);
                        UI.Notify("You've bought a Drum Magazine!");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Drum Magazine!");
                    }
                }
            };
            submenus.OnItemSelect += (sender, item, index) =>
            {
                if (item == s)
                {
                    if (Game.Player.Money > 9999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 10000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, 736523883, 2043113590);
                        UI.Notify("You've bought a Drum Magazine!");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Drum Magazine!");
                    }
                }
            };
            submenump.OnItemSelect += (sender, item, index) =>
            {
                if (item == mp)
                {
                    if (Game.Player.Money > 9999)
                    {
                        Ped p = Game.Player.Character;
                        Game.Player.Money -= 10000;
                        Function.Call(Hash.GIVE_WEAPON_COMPONENT_TO_PED, p, -619010992, -1444295948);
                        UI.Notify("You've bought a Drum Magazine!");
                    }
                    else
                    {
                        UI.Notify("~r~You don't have enough money to buy a Drum Magazine!");
                    }
                }
            };
        }

        private void onTick(object sender, EventArgs e)
        {
            
            // d is the dealers.
            for (int i = 0; i < Dealer_Locations.Count; i++)
            {
                if (World.GetDistance(Game.Player.Character.Position, Dealer_Locations[i]) < 80f)
                {
                    if (d == null)
                    {
                        d = World.CreatePed(PedHash.Dealer01SMY, Dealer_Locations[i], 0);
                        d.IsInvincible = true;
                        d.FreezePosition = true;
                        d.IsEnemy = false;
                        d.IsPersistent = true;
                        d.CanBeTargetted = false;
                        d.Weapons.Give((WeaponHash)Function.Call<int>(Hash.GET_HASH_KEY, "WEAPON_BRIEFCASE"), 999999, true, true);
                    }
                }
            }
            if (d != null)
            {
                if (World.GetDistance(Game.Player.Character.Position, d.Position) >= 80f)
                {
                    d.MarkAsNoLongerNeeded();
                    d.Delete();
                    d = null;
                }
            }
            
            for (int i = 0; i < Dealer_Locations.Count; i++)
            {
                if (Dealer_Locations[i].DistanceTo(Game.Player.Character.Position) < 4f)
                {
                    
                    bool E_button = Function.Call<bool>(Hash.IS_DISABLED_CONTROL_JUST_PRESSED, 2, 51);
                    
                    if (E_button) // Our menu on/off switch
                        mainMenu.Visible = !mainMenu.Visible;
                    if (_menuPool.IsAnyMenuOpen() == false)
                    {
                        DisplayHelpTextThisFrame("Press ~INPUT_CONTEXT~ to toggle the market menu");
                    }
                }
            }


        }

        private void onKeyDown(object sender, KeyEventArgs e)
        {

        }
        void DisplayHelpTextThisFrame(string text) // used to display quit message. credit jedijosh920 for this function
        {
            Function.Call(Hash._SET_TEXT_COMPONENT_FORMAT, "STRING");
            Function.Call(Hash._ADD_TEXT_COMPONENT_STRING, text);
            Function.Call(Hash._0x238FFE5C7B0498A6, 0, 0, 1, -1);
        }
    }
}